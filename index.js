import * as acorn from 'acorn';
import fs from 'fs';
import * as prettier from 'prettier';

function mergeClasses(code, options = {}) {
    const ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        checkPrivateFields: false
    });

    // Build a map of class name -> class node and track export info
    const classMap = new Map();
    const exportInfo = new Map(); // Maps class name to export type ('default' or 'named')

    for (const node of ast.body) {
        if (node.type === 'ClassDeclaration') {
            classMap.set(node.id.name, node);
        } else if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration') {
            const classNode = node.declaration;
            const className = classNode.id ? classNode.id.name : 'default';
            classMap.set(className, classNode);
            exportInfo.set(className, 'default');
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration') {
            const classNode = node.declaration;
            classMap.set(classNode.id.name, classNode);
            exportInfo.set(classNode.id.name, 'named');
        }
    }

    // Identify intermediate classes (classes that are extended by other classes)
    const extendedClasses = new Set();
    if (options.excludeIntermediate) {
        for (const node of ast.body) {
            let classNode = null;

            if (node.type === 'ClassDeclaration') {
                classNode = node;
            } else if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration') {
                classNode = node.declaration;
            } else if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration') {
                classNode = node.declaration;
            }

            if (classNode && classNode.superClass && classNode.superClass.type === 'Identifier') {
                extendedClasses.add(classNode.superClass.name);
            }
        }
    }

    // Function to collect all members (fields, methods, properties) from a class and its parents
    function collectMembers(className, visited = new Set()) {
        if (visited.has(className)) return [];
        visited.add(className);

        const classNode = classMap.get(className);
        if (!classNode) return [];

        const members = [];

        // Collect parent members first
        if (classNode.superClass && classNode.superClass.type === 'Identifier') {
            const parentMembers = collectMembers(classNode.superClass.name, visited);
            members.push(...parentMembers);
        }

        // Collect all members (fields, methods, properties) except constructor
        for (const member of classNode.body.body) {
            // Skip constructors
            if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
                continue;
            }
            // Include everything else: methods, fields (PropertyDefinition), static members, private members, etc.
            members.push({
                member: member,
                fromClass: className
            });
        }

        return members;
    }

    // Function to collect constructor bodies from the inheritance chain
    function collectConstructorBodies(className, visited = new Set()) {
        if (visited.has(className)) return [];
        visited.add(className);

        const classNode = classMap.get(className);
        if (!classNode) return [];

        const constructorBodies = [];

        // Collect parent constructors first (bottom-up approach)
        if (classNode.superClass && classNode.superClass.type === 'Identifier') {
            const parentConstructors = collectConstructorBodies(classNode.superClass.name, visited);
            constructorBodies.push(...parentConstructors);
        }

        // Collect current class constructor body and params
        const constructor = classNode.body.body.find(m => m.type === 'MethodDefinition' && m.kind === 'constructor');
        if (constructor && constructor.value && constructor.value.body) {
            constructorBodies.push({
                body: constructor.value.body,
                params: constructor.value.params,
                fromClass: className
            });
        }

        return constructorBodies;
    }

    // Transform each class
    const output = [];
    let lastEnd = 0;

    for (const node of ast.body) {
        let classNode = null;
        let isExportDefault = false;
        let isExportNamed = false;
        let nodeStart = node.start;
        let nodeEnd = node.end;

        if (node.type === 'ClassDeclaration') {
            classNode = node;
        } else if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration') {
            classNode = node.declaration;
            isExportDefault = true;
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration') {
            classNode = node.declaration;
            isExportNamed = true;
        }

        if (classNode) {
            const className = classNode.id ? classNode.id.name : 'default';

            // Skip non-exported classes if exportOnly is enabled
            if (options.exportOnly && !exportInfo.has(className)) {
                // Skip this class but preserve non-class content before it
                output.push(code.substring(lastEnd, nodeStart));
                lastEnd = nodeEnd;
                continue;
            }

            // Skip intermediate classes if excludeIntermediate is enabled
            if (options.excludeIntermediate && extendedClasses.has(className)) {
                // Skip this class but preserve non-class content before it
                output.push(code.substring(lastEnd, nodeStart));
                lastEnd = nodeEnd;
                continue;
            }

            // Get all inherited members
            const inheritedMembers = [];
            if (classNode.superClass && classNode.superClass.type === 'Identifier') {
                inheritedMembers.push(...collectMembers(classNode.superClass.name) );
            }

            // Get all constructor bodies in the inheritance chain
            const constructorBodies = collectConstructorBodies(className);

            // Build the new class without extends
            output.push(code.substring(lastEnd, nodeStart));

            // Add export prefix - always export transformed classes
            if (isExportDefault) {
                output.push('export default ');
            } else {
                // Always add export keyword to make classes importable
                output.push('export ');
            }

            output.push(generateClass(classNode, inheritedMembers, constructorBodies, code));
            lastEnd = nodeEnd;
        }
    }

    output.push(code.substring(lastEnd));
    return output.join('');
}

function generateClass(classNode, inheritedMembers, constructorBodies, originalCode) {
    const className = classNode.id ? classNode.id.name : 'AnonymousClass';
    let result = `class ${className} {\n`;

    // Merge constructors from the inheritance chain
    const constructor = classNode.body.body.find(m => m.type === 'MethodDefinition' && m.kind === 'constructor');
    if (constructor || constructorBodies.length > 0) {
        // Find the first non-empty parameter list from top (derived class) to bottom (base class)
        let params = '';

        // Start from the end of constructorBodies (which represents the topmost/derived class)
        // and work backwards to find the first constructor with non-empty params
        for (let i = constructorBodies.length - 1; i >= 0; i--) {
            const { params: ctorParams } = constructorBodies[i];
            if (ctorParams && ctorParams.length > 0) {
                const paramsStart = ctorParams[0].start;
                const paramsEnd = ctorParams[ctorParams.length - 1].end;
                params = originalCode.substring(paramsStart, paramsEnd);
                break;
            }
        }

        result += `    constructor(${params}) {\n`;

        // Add all constructor bodies in order (from base class to derived class)
        for (const { body } of constructorBodies) {
            // Extract the body statements, removing the braces and super() calls
            const bodyCode = originalCode.substring(body.start + 1, body.end - 1);
            const cleanedBody = bodyCode.replace(/super\([^)]*\);?\s*/g, '');
            if (cleanedBody.trim()) {
                result += '        ' + cleanedBody.trim() + '\n';
            }
        }

        result += '    }\n';
    }

    // Add own members (everything except constructor)
    for (const member of classNode.body.body) {
        if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
            continue; // Skip constructor, already handled
        }
        const memberCode = originalCode.substring(member.start, member.end);
        result += '    ' + memberCode + '\n';
    }

    // Add inherited members with comments
    // Build a set of already-added member names to avoid duplicates
    const addedMembers = new Set();
    for (const member of classNode.body.body) {
        if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
            continue;
        }
        // Get member identifier
        const memberId = getMemberId(member, originalCode);
        if (memberId) addedMembers.add(memberId);
    }

    for (const { member, fromClass } of inheritedMembers) {
        const memberId = getMemberId(member, originalCode);
        // Skip if member is overridden
        if (memberId && addedMembers.has(memberId)) continue;
        if (memberId) addedMembers.add(memberId);

        const memberCode = originalCode.substring(member.start, member.end);
        result += `    // from ${fromClass}\n`;
        result += '    ' + memberCode + '\n';
    }

    result += '}';
    return result;
}

function extractClasses(code){
  const result = [];
  // entry format:  {className: 'Pulse', content: 'export default class Pulse extends Subscriptions...'}

  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    checkPrivateFields: false
  });

  for (const node of ast.body) {
    let classNode = null;

    // Check if it's a class declaration (with or without export)
    if (node.type === 'ClassDeclaration') {
      classNode = node;
    } else if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration') {
      classNode = node.declaration;
    } else if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration') {
      classNode = node.declaration;
    }

    if (classNode && classNode.id) {
      const className = classNode.id.name;
      const classCode = code.substring(classNode.start, classNode.end);
      const content = 'export default ' + classCode;

      result.push({
        className,
        content
      });
    }
  }

  return result;
}

// Get a unique identifier for a member (to detect overrides)
function getMemberId(member, originalCode) {
    if (member.type === 'MethodDefinition') {
        const isStatic = member.static ? 'static:' : '';
        if (member.key.type === 'Identifier') {
            return isStatic + member.key.name;
        } else if (member.key.type === 'PrivateIdentifier') {
            return isStatic + originalCode.substring(member.key.start, member.key.end);
        }
    } else if (member.type === 'PropertyDefinition') {
        const isStatic = member.static ? 'static:' : '';
        if (member.key.type === 'Identifier') {
            return isStatic + member.key.name;
        } else if (member.key.type === 'PrivateIdentifier') {
            return isStatic + originalCode.substring(member.key.start, member.key.end);
        }
    }
    return null;
}

// Format code using prettier
export async function formatCode(codeStr) {
    return await prettier.format(codeStr.trim(), { semi: false, parser: "babel" });
}

// Order class members according to JavaScript conventions
function orderCode(code) {
    const ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        checkPrivateFields: false
    });

    const output = [];
    let lastEnd = 0;

    for (const node of ast.body) {
        let classNode = null;
        let nodeStart = node.start;
        let nodeEnd = node.end;
        let exportPrefix = '';

        if (node.type === 'ClassDeclaration') {
            classNode = node;
        } else if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'ClassDeclaration') {
            classNode = node.declaration;
            exportPrefix = 'export default ';
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'ClassDeclaration') {
            classNode = node.declaration;
            exportPrefix = 'export ';
        }

        if (classNode) {
            output.push(code.substring(lastEnd, nodeStart));
            output.push(exportPrefix);
            output.push(reorderClass(classNode, code));
            lastEnd = nodeEnd;
        }
    }

    output.push(code.substring(lastEnd));
    return output.join('');
}

// Reorder members within a class
function reorderClass(classNode, originalCode) {
    const className = classNode.id ? classNode.id.name : 'AnonymousClass';

    // Categorize members
    const staticPrivateProps = [];
    const staticPublicProps = [];
    const staticPrivateMethods = [];
    const staticPublicMethods = [];
    const privateProps = [];
    const publicProps = [];
    const constructor = [];
    const gettersSetters = [];
    const privateMethods = [];
    const publicMethods = [];

    for (const member of classNode.body.body) {
        const memberCode = originalCode.substring(member.start, member.end);
        const isStatic = member.static;
        const isPrivate = member.key && member.key.type === 'PrivateIdentifier';

        if (member.type === 'PropertyDefinition') {
            if (isStatic && isPrivate) {
                staticPrivateProps.push(memberCode);
            } else if (isStatic) {
                staticPublicProps.push(memberCode);
            } else if (isPrivate) {
                privateProps.push(memberCode);
            } else {
                publicProps.push(memberCode);
            }
        } else if (member.type === 'MethodDefinition') {
            if (member.kind === 'constructor') {
                constructor.push(memberCode);
            } else if (member.kind === 'get' || member.kind === 'set') {
                gettersSetters.push(memberCode);
            } else if (isStatic && isPrivate) {
                staticPrivateMethods.push(memberCode);
            } else if (isStatic) {
                staticPublicMethods.push(memberCode);
            } else if (isPrivate) {
                privateMethods.push(memberCode);
            } else {
                publicMethods.push(memberCode);
            }
        }
    }

    // Build the ordered class
    let result = `class ${className} {\n`;

    // Order: static props, instance props, constructor, getters/setters, methods
    const orderedMembers = [
        ...staticPrivateProps,
        ...staticPublicProps,
        ...staticPrivateMethods,
        ...staticPublicMethods,
        ...privateProps,
        ...publicProps,
        ...constructor,
        ...gettersSetters,
        ...privateMethods,
        ...publicMethods
    ];

    for (const memberCode of orderedMembers) {
        result += '    ' + memberCode + '\n';
    }

    result += '}';
    return result;
}

// Transform accepts string as input, and returns a string as output
async function transform(code, options={excludeIntermediate: true}) {
    const merged = mergeClasses(code, options);
    const ordered = orderCode(merged);
    const formatted = await formatCode(ordered);
    return formatted;
}

export { mergeClasses, transform, extractClasses };
