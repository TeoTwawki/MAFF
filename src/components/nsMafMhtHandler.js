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
/*
  TODO: Level 2 and 3 Compliance - URLs with # signs should have content replaced properly
*/

const mafMhtHandlerContractID = "@mozilla.org/maf/mhthandler_service;1";
const mafMhtHandlerCID = Components.ID("{2a64aca8-a16d-4b6d-937a-ab1977854568}");
const mafMhtHandlerIID = Components.interfaces.nsIMafMhtHandler;

var MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);

/**
 * The MAF MHT Handler.
 */
function MafMhtHandlerServiceClass() {

}

MafMhtHandlerServiceClass.prototype = {

  extractArchive: function(archivefile, destpath) {
    mafdebug("Extracting archive " + archivefile + " to " + destpath);

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

    // If there is more than one part, we have supporting files.
    if (decoder.noOfParts() > 1) {

      var index_filesDir = MafUtils.appendToDir(destpath, "index_files");

      // Create index_files
      MafUtils.createDir(index_filesDir);

      // Decode the root
      var rootPartNo = decoder.rootPartNo();
      var rootPart = decoder.getPartNo(rootPartNo);
      var contentHandler = new extractContentHandlerClass(destpath, state, datasource, true, this);
      rootPart.getContent(contentHandler);

      // For each other part, decode
      for (var i=0; i<decoder.noOfParts(); i++) {
        if (i != rootPartNo) {
          // Decode this part
          var thisPart = decoder.getPartNo(i);
          var thisContentHandler = new extractContentHandlerClass(index_filesDir, state, datasource, false, this);
          thisPart.getContent(thisContentHandler);
        }
      }

      // Change all the UIDs to local urls
      // DOM Parse all the html, get all the tags, check the state, replace if attribute has key value
      for (var i=0; i<state.htmlFiles.length; i++) {

         var thisPage = MafUtils.readFile(state.htmlFiles[i]);

         var webShell = Components.classes["@mozilla.org/webshell;1"].createInstance();
         webShell.QueryInterface(Components.interfaces.nsIWebNavigation);
         webShell.loadURI("about:blank", Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE, null, null, null);

         try {
           var doc = webShell.document;
           doc.clear();
           doc.write(thisPage);
           doc.close();
           this._makeLinksAbsolute(doc, state.baseUrl[i]);
           this._updateLinks(doc, state);
           MafUtils.deleteFile(state.htmlFiles[i]);
           MafUtils.createFile(state.htmlFiles[i], "<html>" + doc.documentElement.innerHTML + "</html>");
         } catch(e) {
           mafdebug(e);
         }
      }
    }

  },

  _makeLinksAbsolute: function(domDoc, baseUrl) {
    if (baseUrl != "") {
      var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                            .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseUrl;

      var alltags = domDoc.getElementsByTagName("*");
      for (var i=0; i<alltags.length; i++) {
        var tagattrib = alltags[i].attributes;
        for (var j=0; j<tagattrib.length; j++) {
          var attribName = tagattrib[j].name.toLowerCase();
          if ((attribName == "action") ||
              (attribName == "background") ||
              (attribName == "cite") ||
              (attribName == "classid") ||
              (attribName == "codebase") ||
              (attribName == "data") ||
              (attribName == "href") ||
              (attribName == "longdesc") ||
              (attribName == "profile") ||
              (attribName == "src") ||
              (attribName == "usemap")) {

                tagattrib[j].value = obj_baseUrl.resolve(tagattrib[j].value);
          }
        }
      }
    }
  },

  _updateLinks: function(domDoc, state) {
    var alltags = domDoc.getElementsByTagName("*");
    for (var i=0; i<alltags.length; i++) {
      var tagattrib = alltags[i].attributes;
      for (var j=0; j<tagattrib.length; j++) {
        var attribName = tagattrib[j].name.toLowerCase();
        if ((attribName == "action") ||
            (attribName == "background") ||
            (attribName == "cite") ||
            (attribName == "classid") ||
            (attribName == "codebase") ||
            (attribName == "data") ||
            (attribName == "href") ||
            (attribName == "longdesc") ||
            (attribName == "profile") ||
            (attribName == "src") ||
            (attribName == "usemap")) {

            if (state.uidToLocalFilenameMap.hasKey(tagattrib[j].value)) {
              tagattrib[j].value = MafUtils.getURIFromFilename(
                                     getStringValue(state.uidToLocalFilenameMap.getValue(tagattrib[j].value)));
            }

        }
      }
    }
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
      this.handler._updateMetaData(this.datasource, "originalurl", contentLocation);
    } else {
      this.handler._updateMetaData(this.datasource, "originalurl", "Unknown");
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

var MafMhtHandlerService = new MafMhtHandlerServiceClass();

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

