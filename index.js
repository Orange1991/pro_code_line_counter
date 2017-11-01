const Counter = require('./src/counter');
const fs = require('fs');
const path = require('path');

const root = findRoot();
new Counter(root).count().then(count => {
  console.log('\nDirectory: %s\nLines: %s', root, count);
}, err => {
  console.error(err);
});

/**
 * To find the root directory of project
 * @throw {Error} Throw an error if fail to set the root directory
 * @return {string} the root directory of a project
 */
function findRoot() {
  if (process.argv[2]) {
    let proRoot = path.resolve(__dirname, process.argv[2]);
    console.log(`Project root directory: ${proRoot}`);
    if (!fs.existsSync(proRoot)) {
      throw new Error('No such directory');
    }
    return proRoot;
} else {
    throw new Error('Fail to find the root direcotry of the project');
  }
}
