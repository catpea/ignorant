import * as acorn from 'acorn';
import * as walk from "acorn-walk"

// prototype system not core part of this package

class QueryBuilder {
  constructor(code) {
    this.code = code;
    this.ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      checkPrivateFields: false
    });

    this.queryChain = [];

    // Create a function that will be our proxy target
    const chainFunction = (options) => {

      if(typeof options === 'string') options = {key: options};

      // When called as a function, add options to the last chain item
      if (this.queryChain.length > 0) {
        const lastItem = this.queryChain[this.queryChain.length - 1];
        if (typeof lastItem === 'string') {
          this.queryChain[this.queryChain.length - 1] = {
            type: lastItem,
            options: options
          };
        }else{
          this.queryChain [this.queryChain.length - 1].options = options;
        }
      }
      return proxy;
    };

    // Bind the function to this instance
    const boundFunction = chainFunction.bind(this);

    // Create proxy around the bound function
    const proxy = new Proxy(boundFunction, {
      get: (target, prop) => {
        // Handle iteration
        if (prop === Symbol.iterator) {
          return () => this.queryChain[Symbol.iterator]();
        }

        // Special properties
        if ((prop in this)  ) {
          return this[prop] ;
        }

        if (prop === 'toArray' || prop === 'getChain') {
          return () => [...this.queryChain];
        }

        if (prop === 'toString') {
          return () => JSON.stringify(this.queryChain, null, 2);
        }
        if (prop === 'clear') {
          return () => {
            this.queryChain = [];
            return proxy;
          };
        }
        if (prop === 'length') {
          return this.queryChain.length;
        }

        // Ignore symbols (except iterator) and special properties
        if (typeof prop === 'symbol' || prop === 'then') {
          return undefined;
        }

        // Add property name to chain
        this.queryChain.push({type:prop, options:{}});
        return proxy;
      }
    });

    return proxy;
  }

  list(chain) {
    const results = [];
    if (chain.length === 0) return results;

    // If single query, just find all matching nodes
    if (chain.length === 1) {
      const targetType = chain[0].type;
      walk.full(this.ast, (node) => {
        if (node.type === targetType) {
          results.push(node);
        }
      });
      return results;
    }

    // Multi-level query - find nested matches
    const targetType = chain[0].type;
    walk.full(this.ast, (node) => {
      if (node.type === targetType) {
        // Start walking from this node through the chain
        const matches = findInChain(node, chain.slice(1));
        if (matches.length > 0) {
          results.push(...matches);
        }
      }
    });

    return results;
  }
  list1(chain) {
     const results = [];
     if (chain.length === 0) return results;
     // If single query, just find all matching nodes
     if (chain.length === 1) {
       const targetType = chain[0].type;
       walk.simple(this.ast, {
         [targetType](node) {
           results.push(node);
         }
       });
       return results;
     }
     // Multi-level query - find nested matches
     const targetType = chain[0].type;
     walk.simple(this.ast, {
       [targetType](node) {
         // Start walking from this node through the chain
         const matches = findInChain(node, chain.slice(1));
         if (matches.length > 0) {
           results.push(...matches);
         }
       }
     });
     return results;
   }

   /// SEARCH/SELECT API

   // Alternative: return first match
   first() {
     const results = this.list(this.queryChain);
     return results.length > 0 ? results[0] : null;
   }

   // Alternative: check if any matches exist
   exists() {
     return this.list(this.queryChain).length > 0;
   }

   // Alternative: count matches
   count() {
     return this.list(this.queryChain).length;
   }

   name() {
     // Get the 'name' or 'key.name' from current nodes
     return this.list(this.queryChain).map(node => node.key?.name || node.name);
   }
   // helpful litte map function
  map(fn) {
    let chain = this.list(this.queryChain);
    return chain.map(fn);
  }
  get(prop) {
    return this.list(this.queryChain);
  }


}

export default function main(code){
  return new QueryBuilder(code);
}


// Helper: recursively search through remaining chain

function findInChain(node, remainingChain) {
  if (remainingChain.length === 0) {
    return [node];
  }
  const results = [];
  const targetType = remainingChain[0].type;

  walk.full(node, (foundNode) => {
    if (foundNode.type === targetType) {
      if (remainingChain.length === 1) {
        results.push(foundNode);
      } else {
        const deeper = findInChain(foundNode, remainingChain.slice(1));
        results.push(...deeper);
      }
    }
  });

  return results;
}
