/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
 *
 *  This file is part of MAF.
 *
 *  MAF is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  MAF is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License
 *  along with MAF; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

// Provides MAF Util service

function GetMafUtilServiceClass() {
  if (!sharedData.MafUtilService) {
    sharedData.MafUtilService = new MafUtilServiceClass();
  }

  return sharedData.MafUtilService;
}

/**
 * The MAF Util Service.
 */
function MafUtilServiceClass() {

}

MafUtilServiceClass.prototype = {

  /**
   * Cross platform append
   */
  appendToDir: function(initialDirectory, subDirectory) {
    var result = initialDirectory;
    try {
      var dir = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
      dir.initWithPath(initialDirectory);
      dir.append(subDirectory);
      result = dir.path;
    } catch(e) {

    }
    return result;
  },

  /**
   * Create directory
   */
  createDir: function(dirToCreate) {
    var dir = null;
    try {
      dir = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
      dir.initWithPath(dirToCreate);

      // Make the directory!!!
      if (!dir.exists()) {
        dir.create(0x01, 0777);
      }
    } catch (e) {

    }
    return dir;
  },


  /**
   * Create file
   */
  createFile: function(fileToCreate, contents) {
    try {
      var oFile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
      oFile.initWithPath(fileToCreate);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      mafdebug(e);
    }

    try {
      var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                          .createInstance(Components.interfaces.nsIFileOutputStream);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );
      oTransport.write(contents, contents.length);
      oTransport.close();
    } catch (e) {
      mafdebug(e);
    }
  },

  /**
   * Delete file
   */
  deleteFile: function(fileToDelete) {
    try {
      var oFile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
      oFile.initWithPath(fileToDelete);
      if (oFile.exists()) {
        oFile.remove(true);
      }
    } catch (e) {

    }
  },

  /**
   * Based on the suggested filename, new file names are created so as
   * not to overwite existing ones.
   * Code from contentUtils.js
   */
  getUniqueFilename: function(destDir, suggestedFilename) {
    var dir = null;
    try {
      dir = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
      dir.initWithPath(destDir);
    } catch (e) {

    }

    var file;

    dir.append(suggestedFilename);
    file = dir;

    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    }


    return file.leafName;
  },


  /**
   * Based on the suggested filename, new file names are created so as
   * not to overwite existing ones.
   * Code from contentUtils.js
   */
  getFullUniqueFilename: function(file) {
    do {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    } while (file.exists());
  },


  /**
   * Read the contents of a file
   */
  readFile: function(str_Filename) {
    try {
      var obj_File = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                               .createInstance(Components.interfaces.nsIFileInputStream);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_ScriptableIO = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                .createInstance(Components.interfaces.nsIScriptableInputStream);
      obj_ScriptableIO.init(obj_InputStream);
    } catch (e) {
      mafdebug(e);
    }

    try {
      var str = obj_ScriptableIO.read(obj_File.fileSize);
    } catch (e) {

    }
    obj_ScriptableIO.close();
    obj_InputStream.close();

    return str;
  },


  /**
   * Read the contents of a file as bytes
   */
  readBinaryFile: function(str_Filename) {
    try {
      var obj_File = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                               .createInstance(Components.interfaces.nsIFileInputStream);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_BinaryIO = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);

      obj_BinaryIO.setInputStream(obj_InputStream);
    } catch (e) {
      mafdebug(e);
    }

    try {
      //var str = obj_BinaryIO.readBytes(obj_File.fileSize);

      var str = obj_BinaryIO.readByteArray(obj_File.fileSize);

    } catch (e) {
      mafdebug(e);
    }
    obj_BinaryIO.close();
    obj_InputStream.close();

    return str;
  },

  /**
   * Get the URL of the local file specified.
   */
  getURI: function(nsIFile) {
    var serv = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);
    var uri = serv.newFileURI(nsIFile);
    return uri.spec;
  },

  /**
   * Get URL from only a filename
   */
  getURIFromFilename: function(filename) {
    var oFile = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
    oFile.initWithPath(filename);
    return this.getURI(oFile.nsIFile);
  },

  /**
   * Returns the number of open windows
   */
  getNumberOfOpenWindows: function() {
    var numberOfOpenWindows = 0;

    try {
      var wmI = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        numberOfOpenWindows++;
      }
    } catch (e) {
      mafdebug(e);
    }

    return numberOfOpenWindows;
  },

  /**
   * Adds a base tag to HTML.
   * Important so that relative urls not converted by save (such as paths to embedded objects,
   * relative form submit paths, javascripts, etc) can go online to get the missing data.
   */
  addBaseHref: function(sourceString, indexOriginalURL) {
    var resultString = "";
    var baseHrefString = "<base href=\"" + indexOriginalURL + "\" />";
    try {
      var headRe = new RegExp("<[^>]*head[^<]*>", "i"); // Match head tag
      var htmlRe = new RegExp("<[^>]*html[^<]*>", "i"); // Match html tag

      var headMatch = headRe.exec(sourceString);
      var htmlMatch = htmlRe.exec(sourceString);

      // If match head tag, place base href tag right after open head
      if (headMatch != null) {
        resultString = sourceString.substring(0, headMatch.index + headMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(headMatch.index + headMatch.toString().length, sourceString.length);
      } else if(htmlMatch != null) {
        // If no head tag, place after html tag
        resultString = sourceString.substring(0, htmlMatch.index + htmlMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(htmlMatch.index + htmlMatch.toString().length, sourceString.length);
      } else {
        // If no html tag (uhm, ok then) not html?
        resultString = sourceString;
      }
    } catch(e) {

    }
    return resultString;
  },

  /**
   * Get the mime type for a URI using the MIME service
   */
  getMIMETypeForURI: function(url) {
    var result = "application/octet-stream";
    try {
      // Create URI object from url string
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                         .getService(Components.interfaces.nsIIOService);
      var aURI = ioService.newURI(url, null, null);

      // Query MIME service
      var mimeSvc = Components.classes["@mozilla.org/mime;1"]
                       .getService(Components.interfaces.nsIMIMEService);
      result = mimeSvc.getTypeFromURI(aURI);

    } catch (e) {
      // Not available, network url and offline?
    }
    return result;
  },

  /**
   * Mutated from same named function in contentAreaUtils.js
   */
  getDefaultFileName: function(aDefaultFileName, aDocumentURI) {
    try {
      var url = aDocumentURI.QueryInterface(Components.interfaces.nsIURL);
        if (url.fileName != "") {
          // Use the actual file name, if present
          return this.validateFileName(url.fileName);
        }
    } catch (e) {
       
    }

    if (aDefaultFileName) {
      // Use the caller-provided name, if any
      return this.validateFileName(aDefaultFileName);
    }

    try {
      if (aDocumentURI.host) {
        // Use the host.
        return aDocumentURI.host;
      }
    } catch (e) {
      // Some files have no information at all, like Javascript generated pages
    }

    // If all else fails, use "index"
    return "index";
  },

  getExtensionByType: function(contentType) {
    var result = ""; // By default, unknown
    try {
      result = "." + Components.classes["@mozilla.org/mime;1"]
                        .getService(Components.interfaces.nsIMIMEService)
                        .getPrimaryExtension(contentType, "");

      if (result.toLowerCase() == ".bin") { result = ""; }
    } catch(e) {
      mafdebug(e);
    }
    return result;
  }
};