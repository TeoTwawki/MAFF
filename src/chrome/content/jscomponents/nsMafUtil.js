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

const MAFNamespaceId = "MAF";
const MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";

const MAFRDFTemplate = '<?xml version="1.0"?>\n' +
  '<RDF:RDF xmlns:'+ MAFNamespaceId +'="'+ MAFNamespace +'"\n' +
  '     xmlns:NC="http://home.netscape.com/NC-rdf#"\n' +
  '     xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
  '  <RDF:Description about="urn:root">\n'+
  '  </RDF:Description>\n' +
  '</RDF:RDF>\n';

var gRDFService = null;
var gRDFCService = null;

function GetMafUtilServiceClass() {
  if (gRDFService == null) {
    gRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                     .getService(Components.interfaces.nsIRDFService);
  }

  if (gRDFCService == null) {
    gRDFCService = Components.classes["@mozilla.org/rdf/container-utils;1"]
                     .getService(Components.interfaces.nsIRDFContainerUtils);
  }

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
   * Returns true if the file in the path exists
   */
  checkFileExists: function(filePathToCheck) {
    var oFile = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
    oFile.initWithPath(filePathToCheck);
    return oFile.exists();
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
  getFullUniqueFilename: function(suggestedPathAndFilename) {
    var dir = null;
    try {
      dir = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
      dir.initWithPath(suggestedPathAndFilename);
    } catch (e) {

    }

    var file;

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


    return file.path;
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
   * Create RDF file based on template.
   */
  createRDF: function(path, filename) {
    var dir = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);
    dir.initWithPath(path);
    dir.append(filename);

    try {
      var oFile = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
      oFile.initWithPath(dir.path);
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
      oTransport.write(MAFRDFTemplate, MAFRDFTemplate.length);
      oTransport.close();
    } catch (e) {
      mafdebug(e);
    }

    // Load a remote data source
    var datasource = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"]
                        .createInstance(Components.interfaces.nsIRDFRemoteDataSource);
    datasource.Init(this.getURI(oFile.nsIFile));
    datasource.Refresh(true);

    return datasource;
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
   * Add string data to the data source.
   */
  addStringData: function(datasource, name, value) {
    try {
    var rootSubject = gRDFService.GetResource("urn:root");
    var predicate = gRDFService.GetResource(MAFNamespace + name);
    var object = gRDFService.GetResource(value);

    // Make sure we have an interface that we can assert to
    modDataSource = datasource.QueryInterface(Components.interfaces.nsIRDFDataSource);

    modDataSource.Assert(rootSubject, predicate, object, true);
    } catch(e) {
      mafdebug(e);
    }
  },

  /**
   * Opens a list of URLs in tabs.
   */
  openListInTabs: function(urlList, oBrowser) {
    try {
      var triedFirstTab = false;
      for (var i=0; i<urlList.length; i++) {
        if (triedFirstTab) {
          oBrowser.addTab(urlList[i]);
        } else {
          triedFirstTab = true;
          if ((oBrowser.browsers.length == 1) && (oBrowser.currentURI.spec == "about:blank")) {
            oBrowser.loadURI(urlList[i], null, null);
          } else {
            oBrowser.addTab(urlList[i]);
          }

        }
      }
    } catch(e) {

    }
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
   * Returns true if a window with that id is open
   */
  isWindowOpen: function(needleLocation) {
    var result = false;

    try {
      var wmI = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        if (currWindow.location == needleLocation) {
          result = true;
          break;
        }
      }
    } catch (e) {
      mafdebug(e);
    }

    return result;
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

  validateFileName: function(aFileName) {
    if (!this.navigator) {
      this.navigator = Components.classes["@mozilla.org/appshell/appShellService;1"]
                            .getService(Components.interfaces.nsIAppShellService)
                            .hiddenDOMWindow.navigator;
    }

    var re = /[\/\|]+/g;
    if (this.navigator.appVersion.indexOf("Windows") != -1) {
      re = /[\\\/\|]+/g;
      aFileName = aFileName.replace(/[\"]+/g, "'");
      aFileName = aFileName.replace(/[\*\:\?]+/g, " ");
      aFileName = aFileName.replace(/[\<]+/g, "(");
      aFileName = aFileName.replace(/[\>]+/g, ")");
    } else {
      if (this.navigator.appVersion.indexOf("Macintosh") != -1) {
        re = /[\:\/]+/g;
      }
    }

    return aFileName.replace(re, "_");
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