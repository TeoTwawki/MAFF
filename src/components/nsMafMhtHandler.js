/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4.0
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2004 Christopher Ottley.
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

// Provides MAF MHT Handler services

const mafMhtHandlerContractID = "@mozilla.org/maf/mhthandler_service;1";
const mafMhtHandlerCID = Components.ID("{2a64aca8-a16d-4b6d-937a-ab1977854568}");
const mafMhtHandlerIID = Components.interfaces.nsIMafMhtHandler;

try {
  var MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                    .getService(Components.interfaces.nsIMafUtil);
} catch(e) {
  mafdebug(e);
}

/**
 * The MAF MHT Handler.
 */
function MafMhtHandlerServiceClass() {

}

MafMhtHandlerServiceClass.prototype = {

  extractArchive: function(archivefile, destpath) {
    // MafUtil service - Create destpath
    MafUtils.createDir(destpath);

    // Create index.rdf in destpath
    var datasource = MafUtils.createRDF(destpath, "index.rdf");
    datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

    try {

      var decoder = Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
                      .createInstance(Components.interfaces.nsIMafMhtDecoder);
      var f = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
      f.initWithPath(archivefile);
      decoder.initWithFile(f);

    } catch(e) {
      mafdebug(e);
    }

    this._addSubjectAndDateMetaData(decoder, datasource);


    var state = new extractContentHandlerStateClass();

    // Only one part in file
    if (decoder.noOfParts() == 1) {
      var contentHandler = new extractContentHandlerClass(destpath, state, datasource, true, this);

      decoder.getContent(contentHandler);
    }

    var multipartDecodeList = new Array();

    var decodedRoot = false;

    // If there is more than one part, we have supporting files.
    if (decoder.noOfParts() > 1) {

      var index_filesDir = MafUtils.appendToDir(destpath, "index_files");

      // Create index_files
      MafUtils.createDir(index_filesDir);

      multipartDecodeList.push(decoder);
    }

    while (multipartDecodeList.length > 0) {
      decoder = multipartDecodeList.pop();

      if (!decodedRoot) { // The root is assumed not to be another multipart part
        // Decode the root
        var rootPartNo = decoder.rootPartNo();
        var rootPart = decoder.getPartNo(rootPartNo);
        var contentHandler = new extractContentHandlerClass(destpath, state, datasource, true, this);
        rootPart.getContent(contentHandler);
        decodedRoot = true;
      } else {
        var rootPartNo = -1;
      }

      // For each other part, decode
      for (var i=0; i<decoder.noOfParts(); i++) {
        if (i != rootPartNo) {
          // Decode this part
          var thisPart = decoder.getPartNo(i);
          if (thisPart.noOfParts() > 1) {
            multipartDecodeList.push(thisPart);
          } else {
            var thisContentHandler = new extractContentHandlerClass(index_filesDir, state, datasource, false, this);
            thisPart.getContent(thisContentHandler);
          }
        }
      }
    }

    // Change all the UIDs to local urls
    // Original plan: DOM Parse all the html, get all the tags, check the state, replace if attribute has key value
    //    Issues: DOM Parsing dies due to security exceptions and is not easily synchronous
    // New plan: Use regular expressions
    //              - O(3n*m) algorithm. - Can optimize to make it O(n*m)
    for (var i=0; i<state.htmlFiles.length; i++) {

       var thisPage = MafUtils.readFile(state.htmlFiles[i]);

       try {
         thisPage = this._makeUrlsAbsolute(thisPage, state.baseUrl[i]);
         thisPage = this._replaceCids(thisPage, state);
         thisPage = this._replaceUrls(thisPage, state);
         MafUtils.deleteFile(state.htmlFiles[i]);
         MafUtils.createFile(state.htmlFiles[i], thisPage);
       } catch(e) {
         mafdebug(e);
       }
    }

  },

  _makeUrlsAbsolute: function(sourceString, baseUrl) {
    var resultString = "";
    var unprocessedString = sourceString;

    if (baseUrl != "") {
      var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                            .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseUrl;

      var tagre = new RegExp("<[\s]*[a-z]+[^><]*>", "i");
      var urlattribre = new RegExp("(action|background|cite|classid|codebase|data|href|longdesc|profile|src|usemap){1}"
                                  + "[\s]*=[\s]*(('[^'<>]+')|(\"[^\"<>]+\")|([^'\"<>\s]+)){1}", "i");
      var m = tagre.exec(unprocessedString);
      while (m != null) {
        resultString += unprocessedString.substring(0, m.index);
        var tagstr = m.toString();

        // Now we have the tag, find the attribute in it that has a url
        var newTagstr = "";

        var u = urlattribre.exec(tagstr);
        while (u != null) {
          newTagstr += tagstr.substring(0, u.index);
          var urlattribstr = u[0].toString();

          var newUrlattribstr = urlattribstr.substring(0, urlattribstr.indexOf("=") + 1);

          newTagstr += newUrlattribstr;

          var attribstr = urlattribstr.substring(urlattribstr.indexOf("=") + 1, urlattribstr.length).trim();

          var quote = "";
          var unquotedattrib = attribstr;
          // If the attribute is quoted, store the quote and remove it
          if (attribstr.startsWith("\"") || attribstr.startsWith("'")) {
            quote = attribstr.substring(0, 1);
            unquotedattrib = attribstr.substring(1, attribstr.length -1);
          }

          unquotedattrib = obj_baseUrl.resolve(unquotedattrib);

          newTagstr += quote + unquotedattrib + quote;

          tagstr = tagstr.substring(u.index + urlattribstr.length, tagstr.length);
          u = urlattribre.exec(tagstr);
        }

        newTagstr += tagstr;

        resultString += newTagstr;

        unprocessedString = unprocessedString.substring(m.index + m.toString().length, unprocessedString.length);
        m = tagre.exec(unprocessedString);
      }


    }

    resultString += unprocessedString;
    return resultString;
  },

  /**
   * Use a regular expression to replace cid URLs with ones from the archive
   */
  _replaceCids: function(sourceString, state) {
    var resultString = "";
    var unprocessedString = sourceString;

    var re = new RegExp("cid:[^>\"']+", "i"); // Absolute URL regular expression

    var m = re.exec(unprocessedString);
    while (m != null) {
      resultString += unprocessedString.substring(0, m.index);
      var originalUrl = m.toString();

      // TODO, decode anything else that might give trouble
      originalUrl = originalUrl.replaceAll("&amp;", "&");

      // Cater for Hashes
      var baseUrl = originalUrl.split("#")[0];
      var leftOver = originalUrl.split("#")[1];

      baseUrl = "cid:" + baseUrl.substring("cid:".length, baseUrl.length);

      if (state.uidToLocalFilenameMap.hasKey(baseUrl)) {
        resultString += MafUtils.getURIFromFilename(
                                     getStringValue(state.uidToLocalFilenameMap.getValue(baseUrl)));
        if (typeof(leftOver) != "undefined") {
          resultString += "#" + leftOver;
        }
      } else {
        resultString += m.toString();
      }

      unprocessedString = unprocessedString.substring(m.index + m.toString().length, unprocessedString.length);
      m = re.exec(unprocessedString);
    }

    resultString += unprocessedString;
    return resultString;
  },

  /**
   * Use a regular expression to replace URLs with ones from the archive
   */
  _replaceUrls: function(sourceString, state) {
    var resultString = "";
    var unprocessedString = sourceString;

      var tagre = new RegExp("<[\s]*[a-z]+[^><]*>", "i");
      var urlattribre = new RegExp("(action|background|cite|classid|codebase|data|href|longdesc|profile|src|usemap){1}"
                                  + "[\s]*=[\s]*(('[^'<>]+')|(\"[^\"<>]+\")|([^'\"<>\s]+)){1}", "i");
      var m = tagre.exec(unprocessedString);
      while (m != null) {
        resultString += unprocessedString.substring(0, m.index);
        var tagstr = m.toString();

        // Now we have the tag, find the attribute in it that has a url
        var newTagstr = "";

        var u = urlattribre.exec(tagstr);
        while (u != null) {
          newTagstr += tagstr.substring(0, u.index);
          var urlattribstr = u[0].toString();

          var newUrlattribstr = urlattribstr.substring(0, urlattribstr.indexOf("=") + 1);

          newTagstr += newUrlattribstr;

          var attribstr = urlattribstr.substring(urlattribstr.indexOf("=") + 1, urlattribstr.length).trim();

          var quote = "";
          var unquotedattrib = attribstr;
          // If the attribute is quoted, store the quote and remove it
          if (attribstr.startsWith("\"") || attribstr.startsWith("'")) {
            quote = attribstr.substring(0, 1);
            unquotedattrib = attribstr.substring(1, attribstr.length -1);
          }

          var originalUrl = unquotedattrib.trim();

          // TODO, decode anything else that might give trouble
          originalUrl = originalUrl.replaceAll("&amp;", "&");

          // Cater for Hashes
          var baseUrl = originalUrl.split("#")[0];
          var leftOver = originalUrl.split("#")[1];

          if (state.uidToLocalFilenameMap.hasKey(baseUrl)) {
            originalUrl = MafUtils.getURIFromFilename(
                                   getStringValue(state.uidToLocalFilenameMap.getValue(baseUrl)));
            if (typeof(leftOver) != "undefined") {
              originalUrl += "#" + leftOver;
            }
          }

          newTagstr += quote + originalUrl + quote;

          tagstr = tagstr.substring(u.index + urlattribstr.length, tagstr.length);
          u = urlattribre.exec(tagstr);
        }

        newTagstr += tagstr;

        resultString += newTagstr;

        unprocessedString = unprocessedString.substring(m.index + m.toString().length, unprocessedString.length);
        m = tagre.exec(unprocessedString);
      }

    resultString += unprocessedString;
    return resultString;
  },


  _addSubjectAndDateMetaData: function(decoder, datasource) {
    var subject = "Unknown";
    var dateTimeArchived = "Unknown";

    var headers = decoder.getHeaders();
    while (headers.hasMoreElements()) {
      var header = (headers.getNext()).QueryInterface(Components.interfaces.nsIMafMhtHeaderRec);
      var name = header.name.trim().toLowerCase();
      if (name == "subject") {
         subject = header.value;
      }
      if (name == "date") {
         dateTimeArchived = header.value;
      }
    }

    this._updateMetaData(datasource, "title", subject);
    this._updateMetaData(datasource, "archivetime", dateTimeArchived);
  },

  createArchive: function(archivefile, sourcepath) {
    mafdebug("Creating archive " + archivefile + " from " + sourcepath);
  },

  /**
   * Adds meta data gathered from the MHT to the RDF datasource used by MAF
   *   Url = originalurl
   *   Title = title
   *   Date/Time archived = archivetime
   *   Index file = indexfilename
   */
  _updateMetaData: function(datasource, fieldname, fieldvalue) {
    MafUtils.addStringData(datasource, fieldname, fieldvalue);

    // Write changes to physical file
    datasource.Flush();
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtHandlerIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};


function extractContentHandlerStateClass() {

};

extractContentHandlerStateClass.prototype = {

  uidToLocalFilenameMap: Components.classes["@mozilla.org/dictionary;1"]
                            .createInstance(Components.interfaces.nsIDictionary),

  htmlFiles: new Array(),

  baseUrl: new Array()

};

function extractContentHandlerClass(destpath, state, datasource, isindex, handler) {
  this.destpath = destpath;
  this.handler = handler;
  this.datasource = datasource;
  this.data = "";
  this.isindex = isindex;
  this.state = state;
};

extractContentHandlerClass.prototype = {

  onContentStart: function(contentType, contentId, contentLocation) {
    if (this.isindex) {
      if (contentType != "") { // If there's a type use it
        this.filename = "index" + MafUtils.getExtensionByType(contentType);
      } else { // Otherwise assume it's html
        this.filename = "index.html";
      }
      this.handler._updateMetaData(this.datasource, "indexfilename", this.filename);

      if (contentLocation != "") {
        this.handler._updateMetaData(this.datasource, "originalurl", contentLocation);
      } else {
        this.handler._updateMetaData(this.datasource, "originalurl", "Unknown");
      }
    } else {
      // We need to generate a filename

      // If we have a contentLocation, base it on that
      if (contentLocation != "") {
        var url = Components.classes["@mozilla.org/network/standard-url;1"]
                     .createInstance(Components.interfaces.nsIURL);
        url.spec = contentLocation;

        var defaultFilename = MafUtils.getDefaultFileName("", url);
        // If there's no extension, add one based on type
        if (defaultFilename.indexOf(".") == -1) {
          defaultFilename += MafUtils.getExtensionByType(contentType);
        }

        this.filename = MafUtils.getUniqueFilename(this.destpath, defaultFilename);

      } else {
        // Otherwise base it on the content type
        this.filename = MafUtils.getUniqueFilename(this.destpath,
                            "index" + MafUtils.getExtensionByType(contentType));
      }
    }

    this.destfile = MafUtils.appendToDir(this.destpath, this.filename);

    if (contentType.toLowerCase().indexOf("text/html") >= 0) {
      this.state.htmlFiles.push(this.destfile);
      this.state.baseUrl.push(contentLocation);
    }

    if (contentLocation != "") {
      this.state.uidToLocalFilenameMap.setValue(contentLocation, asStringValue(this.destfile));
    }

    if (contentId != "") {
      this.state.uidToLocalFilenameMap.setValue("cid:" + contentId, asStringValue(this.destfile));
    }
  },

  onContent: function(data) { this.data += data; },

  onBinaryContent: function(data) {
    this.binaryContent = true;
    this.bindata = data;
  },

  onContentComplete: function() {
    if (this.binaryContent) {
      //this.createBinaryFile(this.destfile, this.bindata);
      this.createBinaryFile();
    } else {
      //this.createFile(this.destfile, this.data);
      this.createFile();
    }
  },

  createBinaryFile: function() {

    var fileToCreate = this.destfile;
    var contents = this.bindata;

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

      var obj_BinaryIO = Components.classes["@mozilla.org/binaryoutputstream;1"]
                           .createInstance(Components.interfaces.nsIBinaryOutputStream);
      obj_BinaryIO.setOutputStream(oTransport);

      contents = (contents.toString()).split(",");
      var aContents = new Array();
      for (var i=0; i<contents.length; i++) {
        aContents.push(parseInt(contents[i]));
      }

      obj_BinaryIO.writeByteArray(aContents, aContents.length);
      oTransport.close();
    } catch (e) {
      mafdebug(e);
    }
  },

  createFile: function() {

    var fileToCreate = this.destfile;
    var contents = this.data;

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

  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsIMafMhtDecoderContentHandler) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
};

try {
  var MafMhtHandlerService = new MafMhtHandlerServiceClass();
} catch(e) {
  mafdebug(e);
}

function asStringValue(str) {
  var result = Components.classes["@mozilla.org/libmaf/stringvalue;1"]
                 .createInstance(Components.interfaces.nsIMafStringValue);
  result.value = str;
  return result;
};

function getStringValue(obj) {
  var result = obj.QueryInterface(Components.interfaces.nsIMafStringValue).value;
  return result;
};


function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
};

String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x = this;
  x = x.replace(/^\s*(.*)/, "$1");
  x = x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
String.prototype.replaceAll = function(needle, newneedle) {
  var x = this;
  x = x.split(needle).join(newneedle);
  return x;
};

String.prototype.startsWith = function(needle) {
  return (this.substring(0, needle.length) == needle);
};

var MafMhtHandlerFactory = new Object();

MafMhtHandlerFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafMhtHandlerIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return MafMhtHandlerService.QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MafMhtHandlerModule = new Object();

MafMhtHandlerModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafMhtHandlerCID,
                                  "MafMhtHandler JS Component",
                                  mafMhtHandlerContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MafMhtHandlerModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafMhtHandlerCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MafMhtHandlerFactory;
};

MafMhtHandlerModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MafMhtHandlerModule;
};

