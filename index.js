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
            exportOnly: true,
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

            // Determine if this class should be exported
            // Export if:
            // 1. Originally exported, OR
            // 2. excludeIntermediate is true and this is a leaf class (no children)
            const shouldExport = classInfo.exported ||
                (this.options.excludeIntermediate && !this.inheritanceGraph.has(classInfo.name));

            // Wrap in export if needed
            let finalNode = flattenedClass;
            if (shouldExport) {
                const exportType = classInfo.exportType || 'named';
                if (exportType === 'default') {
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

        // Analyze methods to find super calls and build preservation map
        const { superMethodMap, parentMethodsToKeep } = this.analyzeSuperCalls(allMembers, classInfo.name);

        // Transform super calls in all methods
        this.transformAllSuperCalls(allMembers, superMethodMap);

        // Analyze constructors to find super() calls and build preserved constructors
        const { superConstructorMap, parentConstructorsToKeep } = this.analyzeConstructorSuperCalls(allMembers, classInfo.name);

        // Build final constructor with _super_ pattern
        const finalConstructor = this.buildSuperPatternConstructor(classInfo.name, allMembers, superConstructorMap);

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
        if (finalConstructor) {
            classBody.push(finalConstructor);
        }

        // Add getters/setters
        classBody.push(...this.createMemberNodes(allMembers.gettersSetters, classInfo.name));

        // Add instance private methods
        classBody.push(...this.createMemberNodes(allMembers.instancePrivateMethods, classInfo.name));

        // Add instance public methods
        classBody.push(...this.createMemberNodes(allMembers.instancePublicMethods, classInfo.name));

        // Add preserved parent methods (renamed to avoid conflicts)
        classBody.push(...parentMethodsToKeep);

        // Add preserved parent constructors (renamed to _super_ClassName_constructor)
        classBody.push(...parentConstructorsToKeep);

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
     * Analyze all methods to find super calls and determine which parent methods to preserve
     * Returns: { superMethodMap, parentMethodsToKeep }
     */
    analyzeSuperCalls(allMembers, currentClassName) {
        const superMethodMap = new Map(); // methodName -> _super_ClassName_methodName
        const parentMethodsToKeep = []; // Array of renamed method nodes
        const neededParentMethods = new Set(); // Set of method names that need parent preservation

        // Categories to check for super calls
        const methodCategories = [
            'staticPrivateMethods', 'staticPublicMethods',
            'instancePrivateMethods', 'instancePublicMethods',
            'gettersSetters'
        ];

        // First pass: Find all super calls in all methods
        for (const category of methodCategories) {
            for (const memberEntry of allMembers[category]) {
                const superCalls = this.findSuperCalls(memberEntry.member);
                for (const superCall of superCalls) {
                    if (superCall.memberName && !superCall.isComputed) {
                        neededParentMethods.add(superCall.memberName);
                    }
                }
            }
        }

        // Second pass: For each needed parent method, find its parent implementation
        // and create a renamed version
        for (const methodName of neededParentMethods) {
            const parentImpl = this.findParentMethodImplementation(
                currentClassName,
                methodName,
                allMembers,
                methodCategories
            );

            if (parentImpl) {
                const renamedMethodName = `_super_${parentImpl.fromClass}_${methodName}`;
                superMethodMap.set(methodName, renamedMethodName);

                // Create renamed method node
                const renamedMethod = this.cloneNode(parentImpl.member);
                renamedMethod.key = {
                    type: 'Identifier',
                    name: renamedMethodName
                };

                // Recursively transform any super calls in the parent method too
                const parentSuperMap = this.buildParentSuperMap(
                    parentImpl.fromClass,
                    renamedMethod,
                    methodCategories,
                    allMembers
                );
                this.transformSuperCalls(renamedMethod, parentSuperMap);

                // Add comment indicating this is a preserved parent method
                if (this.options.preserveComments) {
                    renamedMethod.leadingComments = [{
                        type: 'Line',
                        value: ` preserved from ${parentImpl.fromClass} for super calls`
                    }];
                }

                parentMethodsToKeep.push(renamedMethod);
            }
        }

        return { superMethodMap, parentMethodsToKeep };
    }

    /**
     * Find the parent implementation of a method for a given class
     * Uses method history to find the version that comes before the given class
     */
    findParentMethodImplementation(className, methodName, allMembers, methodCategories) {
        // Search through method history to find parent versions
        for (const category of methodCategories) {
            // Build the member ID for this method
            const testMember = allMembers[category].find(m =>
                this.getMethodName(m.member) === methodName
            );

            if (!testMember) continue;

            const historyKey = `${category}:${testMember.memberId}`;
            const history = allMembers.methodHistory?.get(historyKey);

            if (!history || history.length === 0) continue;

            // Find the current class's index in history
            const currentIndex = history.findIndex(h => h.fromClass === className);

            if (currentIndex > 0) {
                // Return the previous version (parent implementation)
                return history[currentIndex - 1];
            } else if (currentIndex === -1 && history.length > 0) {
                // Current class doesn't have this method, return the most recent version
                return history[history.length - 1];
            }
        }

        return null;
    }

    /**
     * Get the method name from a method node
     */
    getMethodName(methodNode) {
        if (methodNode.key?.type === 'Identifier') {
            return methodNode.key.name;
        } else if (methodNode.key?.type === 'PrivateIdentifier') {
            return '#' + methodNode.key.name;
        }
        return null;
    }

    /**
     * Build a super map for a parent method (to handle nested super calls)
     */
    buildParentSuperMap(parentClassName, parentMethod, methodCategories, allMembers) {
        const map = new Map();
        const superCalls = this.findSuperCalls(parentMethod);

        for (const superCall of superCalls) {
            if (superCall.memberName && !superCall.isComputed) {
                const grandparentImpl = this.findParentMethodImplementation(
                    parentClassName,
                    superCall.memberName,
                    allMembers,
                    methodCategories
                );

                if (grandparentImpl) {
                    const renamedName = `_super_${grandparentImpl.fromClass}_${superCall.memberName}`;
                    map.set(superCall.memberName, renamedName);
                }
            }
        }

        return map;
    }

    /**
     * Transform super calls in all methods in the member collection
     */
    transformAllSuperCalls(allMembers, superMethodMap) {
        const methodCategories = [
            'staticPrivateMethods', 'staticPublicMethods',
            'instancePrivateMethods', 'instancePublicMethods',
            'gettersSetters'
        ];

        for (const category of methodCategories) {
            for (const memberEntry of allMembers[category]) {
                this.transformSuperCalls(memberEntry.member, superMethodMap);
            }
        }
    }

    /**
     * Collect all members from the entire inheritance chain
     * Also builds a method history map for super call resolution
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

        // Build method history for super call resolution
        allMembers.methodHistory = allMembers.methodHistory || new Map();

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
        // Initialize method history if not present
        if (!target.methodHistory) {
            target.methodHistory = new Map();
        }

        // Copy method history from source if it exists
        if (source.methodHistory) {
            for (const [key, value] of source.methodHistory) {
                if (!target.methodHistory.has(key)) {
                    target.methodHistory.set(key, []);
                }
                target.methodHistory.get(key).push(...value);
            }
        }

        // Handle constructor specially - we need the chain
        // Check if source is a collection (has constructorChain) or raw members
        if (source.constructorChain && source.constructorChain.length > 0) {
            // Merging a collection - copy the entire chain
            target.constructorChain.push(...source.constructorChain);
            target.constructor = source.constructor;
        } else if (source.constructor) {
            // Raw constructor from categorizeMembers - wrap it
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

                // Track in method history for super call resolution
                const methodName = this.getMethodName(member);
                if (methodName && this.isMethod(category)) {
                    const historyKey = `${category}:${memberId}`;
                    if (!target.methodHistory.has(historyKey)) {
                        target.methodHistory.set(historyKey, []);
                    }
                    target.methodHistory.get(historyKey).push(memberEntry);
                }

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
     * Check if a category is for methods (not fields)
     */
    isMethod(category) {
        return category.includes('Methods') || category === 'gettersSetters';
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
     * Analyze constructor super() calls and build preserved parent constructors
     * Returns: { superConstructorMap, parentConstructorsToKeep }
     */
    analyzeConstructorSuperCalls(allMembers, currentClassName) {
        const superConstructorMap = new Map(); // className -> _super_ClassName_constructor
        const parentConstructorsToKeep = []; // Array of renamed constructor methods

        if (!allMembers.constructor || !allMembers.constructorChain) {
            return { superConstructorMap, parentConstructorsToKeep };
        }

        const constructorChain = allMembers.constructorChain;

        // Build preserved constructors for all parents
        // We need to preserve all constructors except the final one (current class)
        for (let i = 0; i < constructorChain.length - 1; i++) {
            const { member: constructor, fromClass } = constructorChain[i];
            const renamedConstructorName = `_super_${fromClass}_constructor`;

            // Store mapping for transformation
            superConstructorMap.set(fromClass, renamedConstructorName);

            // Clone the constructor and rename it to a regular method
            const renamedConstructor = {
                type: 'MethodDefinition',
                key: {
                    type: 'Identifier',
                    name: renamedConstructorName
                },
                value: {
                    type: 'FunctionExpression',
                    id: null,
                    params: this.cloneNode(constructor.value.params),
                    body: this.cloneNode(constructor.value.body),
                    generator: false,
                    async: false
                },
                kind: 'method',
                computed: false,
                static: false
            };

            // Transform super() calls in this parent constructor
            // Find which parent this constructor was calling
            if (i > 0) {
                const grandparentClass = constructorChain[i - 1].fromClass;
                const grandparentConstructorName = `_super_${grandparentClass}_constructor`;
                this.transformSuperConstructorCalls(renamedConstructor.value.body, grandparentConstructorName);
            } else {
                // This is the root constructor, just remove super() calls
                this.removeSuperConstructorCalls(renamedConstructor.value.body);
            }

            // Add comment indicating this is a preserved parent constructor
            if (this.options.preserveComments) {
                renamedConstructor.leadingComments = [{
                    type: 'Line',
                    value: ` preserved from ${fromClass} constructor`
                }];
            }

            parentConstructorsToKeep.push(renamedConstructor);
        }

        return { superConstructorMap, parentConstructorsToKeep };
    }

    /**
     * Build the final constructor using _super_ pattern
     */
    buildSuperPatternConstructor(className, allMembers, superConstructorMap) {
        if (!allMembers.constructor) {
            return null;
        }

        const constructorChain = allMembers.constructorChain;
        const finalConstructor = constructorChain[constructorChain.length - 1].member;

        // Clone the final constructor
        const constructor = {
            type: 'MethodDefinition',
            key: {
                type: 'Identifier',
                name: 'constructor'
            },
            value: {
                type: 'FunctionExpression',
                id: null,
                params: this.cloneNode(finalConstructor.value.params),
                body: this.cloneNode(finalConstructor.value.body),
                generator: false,
                async: false
            },
            kind: 'constructor',
            computed: false,
            static: false
        };

        // Transform super() calls to this._super_ParentClass_constructor()
        if (constructorChain.length > 1) {
            const parentClass = constructorChain[constructorChain.length - 2].fromClass;
            const parentConstructorName = superConstructorMap.get(parentClass);
            if (parentConstructorName) {
                this.transformSuperConstructorCalls(constructor.value.body, parentConstructorName);
            }
        } else {
            // No parent, just remove any super() calls
            this.removeSuperConstructorCalls(constructor.value.body);
        }

        return constructor;
    }

    /**
     * Transform super() calls in a constructor body to this._super_ClassName_constructor()
     */
    transformSuperConstructorCalls(body, parentConstructorName) {
        if (!body || !body.body) return;

        for (let i = 0; i < body.body.length; i++) {
            const statement = body.body[i];

            if (this.isSuperCall(statement)) {
                // Transform super(...args) to this._super_ParentClass_constructor(...args)
                body.body[i] = {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'CallExpression',
                        callee: {
                            type: 'MemberExpression',
                            object: {
                                type: 'ThisExpression'
                            },
                            property: {
                                type: 'Identifier',
                                name: parentConstructorName
                            },
                            computed: false
                        },
                        arguments: statement.expression.arguments
                    }
                };
            }
        }
    }

    /**
     * Remove super() calls from constructor body (for root constructors)
     */
    removeSuperConstructorCalls(body) {
        if (!body || !body.body) return;

        body.body = body.body.filter(statement => !this.isSuperCall(statement));
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
     * Find all super method calls in a node
     * Returns array of { memberName, isComputed, node }
     */
    findSuperCalls(node, results = []) {
        if (!node || typeof node !== 'object') {
            return results;
        }

        // Check if this is a super call: super.method() or super[expr]()
        if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
            if (node.callee.object?.type === 'Super') {
                const memberName = node.callee.computed
                    ? null // Can't statically determine computed names
                    : node.callee.property?.name;

                results.push({
                    memberName,
                    isComputed: node.callee.computed,
                    callNode: node
                });
            }
        }

        // Recursively search child nodes
        for (const key in node) {
            if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
                continue;
            }
            const value = node[key];
            if (Array.isArray(value)) {
                value.forEach(child => this.findSuperCalls(child, results));
            } else if (value && typeof value === 'object') {
                this.findSuperCalls(value, results);
            }
        }

        return results;
    }

    /**
     * Transform super calls in a method to use renamed parent methods
     * @param {Object} node - The AST node to transform
     * @param {Map} superMethodMap - Map of methodName -> renamedMethodName
     */
    transformSuperCalls(node, superMethodMap) {
        if (!node || typeof node !== 'object') {
            return;
        }

        // Check if this is a super call: super.method()
        if (node.type === 'CallExpression' &&
            node.callee?.type === 'MemberExpression' &&
            node.callee.object?.type === 'Super') {

            if (!node.callee.computed && node.callee.property?.name) {
                const methodName = node.callee.property.name;
                const renamedMethod = superMethodMap.get(methodName);

                if (renamedMethod) {
                    // Transform super.method() to this._super_ClassName_method()
                    node.callee.object = {
                        type: 'ThisExpression'
                    };
                    node.callee.property = {
                        type: 'Identifier',
                        name: renamedMethod
                    };
                    node.callee.computed = false;
                }
            }
        }

        // Recursively transform child nodes
        for (const key in node) {
            if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
                continue;
            }
            const value = node[key];
            if (Array.isArray(value)) {
                value.forEach(child => this.transformSuperCalls(child, superMethodMap));
            } else if (value && typeof value === 'object') {
                this.transformSuperCalls(value, superMethodMap);
            }
        }
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
