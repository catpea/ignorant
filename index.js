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
                inheritedMembers.push(...collectMembers(classNode.superClass.name));
            }

            // Build the new class without extends
            output.push(code.substring(lastEnd, nodeStart));

            // Add export prefix if needed
            if (isExportDefault) {
                output.push('export default ');
            } else if (isExportNamed) {
                output.push('export ');
            }

            output.push(generateClass(classNode, inheritedMembers, code));
            lastEnd = nodeEnd;
        }
    }

    output.push(code.substring(lastEnd));
    return output.join('');
}

function generateClass(classNode, inheritedMembers, originalCode) {
    const className = classNode.id ? classNode.id.name : 'AnonymousClass';
    let result = `class ${className} {\n`;

    // Add constructor and remove super() calls
    const constructor = classNode.body.body.find(m => m.type === 'MethodDefinition' && m.kind === 'constructor');
    if (constructor) {
        const constructorCode = originalCode.substring(constructor.start, constructor.end);
        // Remove super() calls - simplest approach
        const cleanedConstructor = constructorCode.replace(/super\([^)]*\);?\s*/g, '');
        result += '    ' + cleanedConstructor + '\n';
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
async function formatCode(codeStr) {
    return await prettier.format(codeStr, { semi: false, parser: "babel" });
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

async function transform(code) {
    const merged = mergeClasses(code, {excludeIntermediate: true});
    const ordered = orderCode(merged);
    const formatted = await formatCode(ordered);
    return formatted;
}

export { mergeClasses, transform };
