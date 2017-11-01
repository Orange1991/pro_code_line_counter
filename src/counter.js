const fs = require('fs');
const path = require('path');
const readline = require('readline');

function Counter(root, ignoreSetting, printDetailEnabled) {
  this.root = root || null;
  this.ignoreSetting = ignoreSetting;
  this.printDetailEnabled = !!printDetailEnabled;
  this.__ignoreList = null;
  this.lines = 0;
};

/**
 * Count all lines of code in a project
 * @return {Promise} return a promise which will be resolved when counting finishes or rejected when error happens
 */
Counter.prototype.count = function() {
  return this._initIgnoreSettings(this.root).then(() => {
    return this._countDir(this.root, this._getFileName(this.root), 0);
  }, err => {
    throw err;
  }).then(() => {
    return this.lines;
  });
};

/**
 * Try to find the .gitignore file and init related settings
 * @param {String} dir - where to find .gitignore file
 * @return {Promise} return a promise which will be resolved when it finished to read all lines
 */
Counter.prototype._initIgnoreSettings = function(dir) {
  let setIgnoreList = () => {
    this.__ignoreList = list.map(str => {
      str = str.replace('.', '\\.').replace('*', '.*');
      if (str[0] !== '^') {
        str = '^' + str;
      }
      if (str[str.length - 1] !== '$') {
        str += '$';
      }
      return str;
    });
  };

  let list = ['.', '..', '.git'];

  // get ignore rules from the arguments
  if (process.argv.length > 3) {
    for (let i=3, len=process.argv.length; i<len; ++i) {
      list.push(process.argv[i]);
    }
  }

  // get ignore fules from the .gitignore file
  let file = path.resolve(dir, '.gitignore');
  if (fs.existsSync(file)) {
    let fRead = fs.createReadStream(file);
    let rl = readline.createInterface({ input: fRead });
    rl.on('line', str => {
      if (str && str.length > 0 && !/^#/.test(str)) {
        list.push(str);
      }
    });
    return new Promise((resolve, reject) => {
      rl.on('close', () => {
        setIgnoreList();
        resolve();
      });
    });
  } else {
    setIgnoreList();
    return Promise.resolve();
  }
};

/**
 * Check if a file or folder should be ignored
 * @param {String} name - folder name or file name
 * @return {Boolean} If not ignore mode return false
 *                   If ignore mode, return true if a file or folder should be ignored
 */
Counter.prototype._shouldIgnore = function(name) {
  return name && this.__ignoreList.some(str => {
    return new RegExp(str).test(name);
  });
}

/**
 * Count the code in a directory 
 * @param {String} dir - the path of the directory
 * @param {String} name - the name of the directory
 * @param {Number} depth - the directory depth base on the root directory
 * @retrun {Promise} return a promise which will be resolved when count all files and sub folders
 */
Counter.prototype._countDir = function(dir, name, depth) {
  if (!name || name === '.' || name === '..') {
    return Promise.resolve();
  }
  let ignore = this._shouldIgnore(name);
  this._printPath(dir, depth, true, ignore ? 'ignore' : null);
  if (ignore) {
    return Promise.resolve();
  }
  let files = fs.readdirSync(dir);
  if (!files || !files.length) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let len = files.length;
    let nextProm = (index) => {
      if (index >= len) {
        resolve();
      } else {
        let curFileName = files[index];
        let nextPath = path.join(dir, curFileName);
        let file = fs.statSync(nextPath);
        let prom = file.isDirectory()
          ? this._countDir(nextPath, curFileName, depth + 1)
          : this._countFile(nextPath, curFileName, depth + 1);
        return prom.then((count) => {
          if (!file.isDirectory()) {
            this.lines += count;
          }
          return nextProm(index + 1);
        }, err => {
          reject(err);
        });
      }
    };
    return nextProm(0);
  });
}

/**
 * Count the code in a file 
 * @param {String} p - the path of the file
 * @param {String} name - the name of the file
 * @param {Number} depth - the directory depth base on the root directory
 * @retrun {Promise} return a promise which will be resolved by lines count when counting finishes
 */
Counter.prototype._countFile = function(p, name, depth) {
  let ignore = this._shouldIgnore(name);
  let count = 0;
  if (!ignore) {
    let rl = readline.createInterface({input: fs.createReadStream(p)});
    rl.on('line', () => {
      ++count;
    });
    return new Promise((resolve, reject) => {
      rl.on('close', () => {
        this._printPath(p, depth, false, count);
        resolve(count);
      });
    })
  } else {
    this._printPath(p, depth, false, 'ignore');
    return Promise.resolve(count);
  }
};

/**
 * Print a line for a folder or line
 * @param {String} dir - the path of the directory
 * @param {Number} depth - the directory depth base on the root directory
 * @param {Boolean} isFolder - whether the destination file is a folder
 * @param {String} info - other infomation
 */
Counter.prototype._printPath = function(dir, depth, isFolder, info) {
  let pathStr = '';
  for (let i=0; i<depth; ++i) {
    pathStr += '| ';
  }
  pathStr += '|-' + (isFolder ? '\x1B[33m' : '') + this._getFileName(dir) + '\x1B[39m';
  if (info || info === 0) {
    pathStr += ` (${info})`;
  }
  console.log(pathStr);
}


/**
 * Get the dir name or file name
 * @param {String} path - path of a directory or file
 * @return {String} the dir name or file name
 */
Counter.prototype._getFileName = function (s) {
  if (!s || typeof(s) !== 'string') {
    return null;
  }
  return s.substring(s.lastIndexOf(path.sep) + 1);
}


module.exports = Counter;

