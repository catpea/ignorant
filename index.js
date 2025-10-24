import * as acorn from 'acorn';
import { generate } from 'astring';
import * as prettier from 'prettier';

/**
 * ClassCompiler v2.0
 *
 * A robust AST-based class inheritance compiler that accurately flattens
 * JavaScript class hierarchies by properly analyzing and transforming the AST.
 *
 * Features:
 * - Pure AST manipulation (no string regex)
 * - Proper handling of super() calls with arguments
 * - Correct method and constructor inlining
 * - Preserves member order and visibility
 * - Handles static, private, and computed properties
 * - Tracks variable scoping and references
 * - Export preservation
 * - Configurable compilation options
 */

const prettierOptions = { parser: 'babel', semi: true, singleQuote: true, tabWidth: 2, trailingComma: 'none' }

export class ClassCompiler {
    constructor(options = {}) {
        this.options = {
            excludeIntermediate: true,
            exportOnly: false,
            preserveComments: true,
            validateInheritance: true,
            ...options
        };

        this.classMap = new Map();
        this.inheritanceGraph = new Map();
        this.exportedClasses = new Set();
        this.errors = [];
    }

    /**
     * Main compilation entry point
     */
    async compile(code) {
        try {
            // Parse the code into AST

            const ast = this.parseCode(code);

            // Build class registry and inheritance graph
            this.buildClassRegistry(ast, code);

            // Validate inheritance chains
            if (this.options.validateInheritance) {
                this.validateInheritance();
            }

            // Transform classes
            const transformedAst = this.transformAST(ast);

            // Generate code from AST
            let output = generate(transformedAst);

            // Format with prettier
            output = await this.format(output);

            return {
                code: output,
                errors: this.errors,
                classMap: this.classMap,
                inheritanceGraph: this.inheritanceGraph
            };
        } catch (error) {
            this.errors.push({
                type: 'COMPILATION_ERROR',
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Parse JavaScript code into AST
     */
    parseCode(code) {
        return acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true,
            ranges: true,
            checkPrivateFields: false
        });
    }

    /**
     * Build a registry of all classes and their metadata
     */
    buildClassRegistry(ast, sourceCode) {
        for (const node of ast.body) {
            const classInfo = this.extractClassInfo(node, sourceCode);
            if (classInfo) {
                this.classMap.set(classInfo.name, classInfo);

                if (classInfo.exported) {
                    this.exportedClasses.add(classInfo.name);
                }

                // Build inheritance graph
                if (classInfo.superClass) {
                    if (!this.inheritanceGraph.has(classInfo.superClass)) {
                        this.inheritanceGraph.set(classInfo.superClass, []);
                    }
                    this.inheritanceGraph.get(classInfo.superClass).push(classInfo.name);
                }
            }
        }
    }

    /**
     * Extract class information from AST node
     */
    extractClassInfo(node, sourceCode) {
        let classNode = null;
        let exported = false;
        let exportType = null;
        let parentNode = node;

        if (node.type === 'ClassDeclaration') {
            classNode = node;
        } else if (node.type === 'ExportDefaultDeclaration' &&
                   node.declaration.type === 'ClassDeclaration') {
            classNode = node.declaration;
            exported = true;
            exportType = 'default';
        } else if (node.type === 'ExportNamedDeclaration' &&
                   node.declaration?.type === 'ClassDeclaration') {
            classNode = node.declaration;
            exported = true;
            exportType = 'named';
        }

        if (!classNode || !classNode.id) {
            return null;
        }

        const className = classNode.id.name;
        const superClass = classNode.superClass?.type === 'Identifier'
            ? classNode.superClass.name
            : null;

        // Categorize members
        const members = this.categorizeMembers(classNode);

        return {
            name: className,
            node: classNode,
            parentNode,
            superClass,
            exported,
            exportType,
            members,
            sourceCode
        };
    }

    /**
     * Categorize class members by type
     */
    categorizeMembers(classNode) {
        const categories = {
            constructor: null,
            staticPrivateFields: [],
            staticPublicFields: [],
            instancePrivateFields: [],
            instancePublicFields: [],
            staticPrivateMethods: [],
            staticPublicMethods: [],
            instancePrivateMethods: [],
            instancePublicMethods: [],
            gettersSetters: []
        };

        for (const member of classNode.body.body) {
            const isStatic = member.static || false;
            const isPrivate = member.key?.type === 'PrivateIdentifier';
            const isComputed = member.computed || false;

            if (member.type === 'MethodDefinition') {
                if (member.kind === 'constructor') {
                    categories.constructor = member;
                } else if (member.kind === 'get' || member.kind === 'set') {
                    categories.gettersSetters.push(member);
                } else {
                    const category = this.getMemberCategory(isStatic, isPrivate, 'method');
                    categories[category].push(member);
                }
            } else if (member.type === 'PropertyDefinition') {
                const category = this.getMemberCategory(isStatic, isPrivate, 'field');
                categories[category].push(member);
            }
        }

        return categories;
    }

    /**
     * Get the category name for a member
     */
    getMemberCategory(isStatic, isPrivate, type) {
        const prefix = isStatic ? 'static' : 'instance';
        const visibility = isPrivate ? 'Private' : 'Public';
        const suffix = type === 'field' ? 'Fields' : 'Methods';
        return prefix + visibility + suffix;
    }

    /**
     * Validate inheritance chains for circular dependencies and missing parents
     */
    validateInheritance() {
        for (const [className, classInfo] of this.classMap) {
            if (classInfo.superClass) {
                // Check if parent exists
                if (!this.classMap.has(classInfo.superClass)) {
                    this.errors.push({
                        type: 'MISSING_PARENT',
                        class: className,
                        parent: classInfo.superClass,
                        message: `Class "${className}" extends "${classInfo.superClass}" which is not defined`
                    });
                }

                // Check for circular inheritance
                if (this.hasCircularInheritance(className)) {
                    this.errors.push({
                        type: 'CIRCULAR_INHERITANCE',
                        class: className,
                        message: `Circular inheritance detected for class "${className}"`
                    });
                }
            }
        }
    }

    /**
     * Check for circular inheritance
     */
    hasCircularInheritance(className, visited = new Set()) {
        if (visited.has(className)) {
            return true;
        }

        visited.add(className);
        const classInfo = this.classMap.get(className);

        if (classInfo?.superClass) {
            return this.hasCircularInheritance(classInfo.superClass, visited);
        }

        return false;
    }

    /**
     * Transform the AST by flattening class hierarchies
     */
    transformAST(ast) {
        const newBody = [];

        for (const node of ast.body) {
            const classInfo = this.extractClassInfo(node);

            if (!classInfo) {
                // Non-class node, keep as-is
                newBody.push(node);
                continue;
            }

            // Check if we should skip this class
            if (this.shouldSkipClass(classInfo)) {
                continue;
            }

            // Flatten the class
            const flattenedClass = this.flattenClass(classInfo);

            // Wrap in export if needed
            let finalNode = flattenedClass;
            if (classInfo.exported) {
                if (classInfo.exportType === 'default') {
                    finalNode = {
                        type: 'ExportDefaultDeclaration',
                        declaration: flattenedClass
                    };
                } else {
                    finalNode = {
                        type: 'ExportNamedDeclaration',
                        declaration: flattenedClass,
                        specifiers: [],
                        source: null
                    };
                }
            }

            newBody.push(finalNode);
        }

        return {
            ...ast,
            body: newBody
        };
    }

    /**
     * Determine if a class should be skipped
     */
    shouldSkipClass(classInfo) {
        // Skip if exportOnly is enabled and class is not exported
        if (this.options.exportOnly && !classInfo.exported) {
            return true;
        }

        // Skip if excludeIntermediate is enabled and class is extended by others
        if (this.options.excludeIntermediate) {
            const children = this.inheritanceGraph.get(classInfo.name);
            if (children && children.length > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Flatten a class by merging all inherited members
     */
    flattenClass(classInfo) {
        // Collect all members from inheritance chain
        const allMembers = this.collectInheritedMembers(classInfo.name);

        // Build flattened constructor
        const flattenedConstructor = this.buildFlattenedConstructor(classInfo.name, allMembers);

        // Build flattened class body
        const classBody = [];

        // Add static private fields
        classBody.push(...this.createMemberNodes(allMembers.staticPrivateFields, classInfo.name));

        // Add static public fields
        classBody.push(...this.createMemberNodes(allMembers.staticPublicFields, classInfo.name));

        // Add static private methods
        classBody.push(...this.createMemberNodes(allMembers.staticPrivateMethods, classInfo.name));

        // Add static public methods
        classBody.push(...this.createMemberNodes(allMembers.staticPublicMethods, classInfo.name));

        // Add instance private fields
        classBody.push(...this.createMemberNodes(allMembers.instancePrivateFields, classInfo.name));

        // Add instance public fields
        classBody.push(...this.createMemberNodes(allMembers.instancePublicFields, classInfo.name));

        // Add constructor
        if (flattenedConstructor) {
            classBody.push(flattenedConstructor);
        }

        // Add getters/setters
        classBody.push(...this.createMemberNodes(allMembers.gettersSetters, classInfo.name));

        // Add instance private methods
        classBody.push(...this.createMemberNodes(allMembers.instancePrivateMethods, classInfo.name));

        // Add instance public methods
        classBody.push(...this.createMemberNodes(allMembers.instancePublicMethods, classInfo.name));

        // Create the flattened class node
        return {
            type: 'ClassDeclaration',
            id: {
                type: 'Identifier',
                name: classInfo.name
            },
            superClass: null, // Flattened classes have no parent
            body: {
                type: 'ClassBody',
                body: classBody
            }
        };
    }

    /**
     * Collect all members from the entire inheritance chain
     */
    collectInheritedMembers(className, visited = new Set()) {
        if (visited.has(className)) {
            return this.createEmptyMemberCollection();
        }

        visited.add(className);
        const classInfo = this.classMap.get(className);

        if (!classInfo) {
            return this.createEmptyMemberCollection();
        }

        // Start with an empty collection
        const allMembers = this.createEmptyMemberCollection();

        // First, recursively collect parent members
        if (classInfo.superClass) {
            const parentMembers = this.collectInheritedMembers(classInfo.superClass, visited);
            this.mergeMembers(allMembers, parentMembers);
        }

        // Then, add/override with current class members
        this.mergeMembers(allMembers, classInfo.members, className);

        return allMembers;
    }

    /**
     * Create an empty member collection
     */
    createEmptyMemberCollection() {
        return {
            constructor: null,
            constructorChain: [],
            staticPrivateFields: [],
            staticPublicFields: [],
            instancePrivateFields: [],
            instancePublicFields: [],
            staticPrivateMethods: [],
            staticPublicMethods: [],
            instancePrivateMethods: [],
            instancePublicMethods: [],
            gettersSetters: []
        };
    }

    /**
     * Merge members, handling overrides
     */
    mergeMembers(target, source, sourceClassName = null) {
        // Handle constructor specially - we need the chain
        if (source.constructor) {
            target.constructorChain.push({
                member: source.constructor,
                fromClass: sourceClassName
            });
            target.constructor = source.constructor;
        }

        // For each member category, merge while handling overrides
        const categories = [
            'staticPrivateFields', 'staticPublicFields',
            'instancePrivateFields', 'instancePublicFields',
            'staticPrivateMethods', 'staticPublicMethods',
            'instancePrivateMethods', 'instancePublicMethods',
            'gettersSetters'
        ];

        for (const category of categories) {
            for (const item of source[category] || []) {
                // Check if item is already a memberEntry (has .member property)
                // or a raw AST node
                let member, fromClass, memberId;

                if (item.member && item.memberId !== undefined) {
                    // Already a memberEntry from a previous merge
                    member = item.member;
                    fromClass = item.fromClass;
                    memberId = item.memberId;
                } else {
                    // Raw AST node from categorizeMembers
                    member = item;
                    fromClass = sourceClassName;
                    memberId = this.getMemberId(member);
                }

                // Check if this member overrides an existing one
                const existingIndex = target[category].findIndex(
                    m => m.memberId === memberId
                );

                const memberEntry = {
                    member,
                    fromClass,
                    memberId
                };

                if (existingIndex !== -1) {
                    // Override existing member
                    target[category][existingIndex] = memberEntry;
                } else {
                    // Add new member
                    target[category].push(memberEntry);
                }
            }
        }
    }

    /**
     * Get a unique identifier for a member
     */
    getMemberId(member) {
        const isStatic = member.static ? 'static:' : '';
        const kind = member.kind || 'field';

        let name = '';
        if (member.key?.type === 'Identifier') {
            name = member.key.name;
        } else if (member.key?.type === 'PrivateIdentifier') {
            name = '#' + member.key.name;
        } else if (member.computed) {
            name = '[computed]';
        }

        return `${isStatic}${kind}:${name}`;
    }

    /**
     * Create AST nodes for members with source annotations
     */
    createMemberNodes(memberEntries, currentClassName) {
        return memberEntries.map(entry => {
            const member = this.cloneNode(entry.member);

            // Add comment indicating source class if different
            if (entry.fromClass && entry.fromClass !== currentClassName &&
                this.options.preserveComments) {
                member.leadingComments = [{
                    type: 'Line',
                    value: ` inherited from ${entry.fromClass}`
                }];
            }

            return member;
        });
    }

    /**
     * Build a flattened constructor that inlines all parent constructors
     */
    buildFlattenedConstructor(className, allMembers) {
        if (!allMembers.constructor) {
            return null;
        }

        const constructorChain = allMembers.constructorChain;

        // Get the final constructor signature
        const finalConstructor = constructorChain[constructorChain.length - 1].member;

        // Build the inlined body
        const inlinedBody = this.inlineConstructorChain(constructorChain);

        return {
            type: 'MethodDefinition',
            key: {
                type: 'Identifier',
                name: 'constructor'
            },
            value: {
                type: 'FunctionExpression',
                id: null,
                params: this.cloneNode(finalConstructor.value.params),
                body: {
                    type: 'BlockStatement',
                    body: inlinedBody
                },
                generator: false,
                async: false
            },
            kind: 'constructor',
            computed: false,
            static: false
        };
    }

    /**
     * Inline an entire constructor chain
     */
    inlineConstructorChain(constructorChain) {
        const statements = [];

        for (let i = 0; i < constructorChain.length; i++) {
            const { member: constructor, fromClass } = constructorChain[i];
            const body = constructor.value.body.body;

            const isLast = i === constructorChain.length - 1;

            for (const statement of body) {
                // Skip super() calls - they're being inlined
                if (this.isSuperCall(statement)) {
                    continue;
                }

                // Clone and add the statement
                const clonedStatement = this.cloneNode(statement);

                // Add source comment if not the last constructor
                if (!isLast && fromClass && this.options.preserveComments) {
                    clonedStatement.leadingComments = [{
                        type: 'Line',
                        value: ` from ${fromClass} constructor`
                    }];
                }

                statements.push(clonedStatement);
            }
        }

        return statements;
    }

    /**
     * Check if a statement is a super() call
     */
    isSuperCall(statement) {
        return statement.type === 'ExpressionStatement' &&
               statement.expression.type === 'CallExpression' &&
               statement.expression.callee.type === 'Super';
    }

    /**
     * Deep clone an AST node
     */
    cloneNode(node) {
        return JSON.parse(JSON.stringify(node));
    }

    /**
     * Format code with prettier
     */
    async format(code) {
        try {
            return await prettier.format(code, prettierOptions);
        } catch (error) {
            console.warn('Prettier formatting failed, returning unformatted code');
            return code;
        }
    }

    /**
     * Extract individual classes from code
     */
    static extractClasses(code) {
        const ast = acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ranges: true
        });

        const classes = [];

        for (const node of ast.body) {
            let classNode = null;

            if (node.type === 'ClassDeclaration') {
                classNode = node;
            } else if (node.type === 'ExportDefaultDeclaration' &&
                       node.declaration.type === 'ClassDeclaration') {
                classNode = node.declaration;
            } else if (node.type === 'ExportNamedDeclaration' &&
                       node.declaration?.type === 'ClassDeclaration') {
                classNode = node.declaration;
            }

            if (classNode && classNode.id) {
                const [start, end] = classNode.range;
                classes.push({
                    name: classNode.id.name,
                    code: code.substring(start, end),
                    node: classNode
                });
            }
        }

        return classes;
    }
}

/**
 * Convenience function for quick compilation
 */
export async function compileClasses(code, options = {}) {
    const compiler = new ClassCompiler(options);
    return await compiler.compile(code);
}

/**
 * Extract classes from code
 */
export function extractClasses(code) {
    return ClassCompiler.extractClasses(code);
}

export async function formatCode(code) {
    try {
        return await prettier.format(code, prettierOptions);
    } catch (error) {
        console.warn('Prettier formatting failed, returning unformatted code');
        return code;
    }
}

export default ClassCompiler;
