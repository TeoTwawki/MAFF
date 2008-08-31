/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.3
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2005 Christopher Ottley.
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

const MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";

var gRDFService = null;
var MafUtils = null;
var MafMhtHandlerService = null;

var MafStrBundle = null;

/**
 * The MAF MHT Handler.
 */
function MafMhtHandlerServiceClass() {

}

MafMhtHandlerServiceClass.prototype = {

  extractArchive: function(archivefile, destpath) {
    var end;

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

    this.xmafused = false;
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

      if (!decodedRoot) {
        // Decode the root
        var rootPartNo = decoder.rootPartNo();
        var rootPart = decoder.getPartNo(rootPartNo);

        // The root is not a multipart part
        if (rootPart.noOfParts() == 1) {
          var contentHandler = new extractContentHandlerClass(destpath, state, datasource, true, this);
          rootPart.getContent(contentHandler);
          decodedRoot = true;
        } else {
          // Multipart
          // Not currently catering for recursion (Multipart inside multipart)
          // TODO: Cater for recursion? Check spec.
          var mRootPartNo = rootPart.rootPartNo();
          var mRootPart = rootPart.getPartNo(mRootPartNo);
          var contentHandler = new extractContentHandlerClass(destpath, state, datasource, true, this);
          mRootPart.getContent(contentHandler);
          decodedRoot = true;

          // Add the rest of the parts from the root to the decode list
          for (var i=0; i<rootPart.noOfParts(); i++) {
            if (i != mRootPartNo) {
              multipartDecodeList.push(rootPart.getPartNo(i));
            }
          }

        }
      } else {
        // No root part number to cater for.
        // If this is not done, then multipart/related decoding may fail.
        rootPartNo = -1;
      }

      // For each other part, decode
      for (var i=0; i<decoder.noOfParts(); i++) {
        if (i != rootPartNo) {
          try  {
            // Decode this part
            var thisPart = decoder.getPartNo(i);
            if (thisPart.noOfParts() > 1) {
              multipartDecodeList.push(thisPart);
            } else {
              var thisContentHandler = new extractContentHandlerClass(index_filesDir, state, datasource, false, this);
              thisPart.getContent(thisContentHandler);
            }
          } catch(e) {

          }
        }
      }
    }

    // Change all the UIDs to local urls
    // Original plan: DOM Parse all the html, get all the tags, check the state, replace if attribute has key value
    //    Issues: DOM Parsing dies due to security exceptions and is not easily synchronous
    // New plan: Use regular expressions
    //              - O(3n*m) algorithm. - Can optimize to make it O(n*m) but harder to manage
    if (!this.xmafused) {
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
    }

    var observerData = new Array();
    observerData[observerData.length] = 0;
    observerData[observerData.length] = destpath;

    var obs = Components.classes["@mozilla.org/observer-service;1"]
                 .getService(Components.interfaces.nsIObserverService);
    obs.notifyObservers(null, "mht-decoder-finished", observerData);
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
        try {
          var newBaseUrlValue = state.uidToLocalFilenameMap.getValue(baseUrl);
          for (var i=0; i<10000; i++) {
            if (newBaseUrlValue == null) { // Timing problem getting the object?
              newBaseUrlValue = state.uidToLocalFilenameMap.getValue(baseUrl);
            } else {
              break;
            }
          }
          resultString += MafUtils.getURIFromFilename(
                                   getStringValue(newBaseUrlValue));
        } catch(e) {
          resultString += baseUrl;
        }
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
            try {
              var newBaseUrlValue = state.uidToLocalFilenameMap.getValue(baseUrl);
              for (var i=0; i<10000; i++) {
                if (newBaseUrlValue == null) { // Timing problem getting the object?
                  newBaseUrlValue = state.uidToLocalFilenameMap.getValue(baseUrl);
                } else {
                  break;
                }
              }
              originalUrl = MafUtils.getURIFromFilename(
                                     getStringValue(newBaseUrlValue));
            } catch(e) {
              originalUrl = baseUrl;
            }
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
      try {
        var header = (headers.getNext()).QueryInterface(Components.interfaces.nsIMafMhtHeaderRec);
        var name = header.name.trim().toLowerCase();
        if (name == "subject") {
           subject = header.value;
        }
        if (name == "date") {
           dateTimeArchived = header.value;
        }
        if (name == "x-maf") {
           this.xmafused = true;
           this.xmafversion = header.value;
        }
      } catch (e) {
        // The interface may not be available as yet?
      }
    }

    this._updateMetaData(datasource, "title", subject);
    this._updateMetaData(datasource, "archivetime", dateTimeArchived);
  },

  createArchive: function(archivefile, sourcepath) {
    try {

      var encoder = Components.classes["@mozilla.org/libmaf/encoder;1?name=mht"]
                      .createInstance(Components.interfaces.nsIMafMhtEncoder);

      var mainMetaData = this._getMainFileMetaData(sourcepath);

      // Get hidden window
      var appShell = Components.classes["@mozilla.org/appshell/appShellService;1"]
                        .getService(Components.interfaces.nsIAppShellService);
      var hiddenWnd = appShell.hiddenDOMWindow;

      var navigator = hiddenWnd.navigator;

      encoder.from = "<Saved by " + navigator.appCodeName + " " + navigator.appVersion + ">";
      encoder.subject = mainMetaData.title;
      encoder.date = mainMetaData.archivetime;

      var indexFilename = mainMetaData.indexfilename;

      var indexFile = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
      indexFile.initWithPath(sourcepath);
      indexFile.append(indexFilename);

      var indexFileType = MafUtils.getMIMETypeForURI(MafUtils.getURI(indexFile));

      // Add the index file
      encoder.addFile(indexFile.path, indexFileType, mainMetaData.originalurl, "");

      // Add supporting files
      var supportFilesList = this._getSupportingFilesList(sourcepath);

      for (var i=0; i<supportFilesList.length; i++) {
        var entry = supportFilesList[i];
        encoder.addFile(entry.filepath, entry.type, entry.originalurl, entry.id);
      }

      var f = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);
      f.initWithPath(archivefile);
      encoder.encodeTo(f);
    } catch(e) {
      mafdebug(e);
    }
  },


  /**
   * Returns an array of supporting index files
   */
  _getSupportingFilesList: function(sourcepath) {
    var result = new Array();

    var subDirList = new Array();
    subDirList[subDirList.length] = ["index_files"];

    var indexFilesRootURI = "";

    while (subDirList.length > 0) {
      var subDirEntry = subDirList.pop();

      var oDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      oDir.initWithPath(sourcepath);

      if (indexFilesRootURI == "") {
        indexFilesRootURI = MafUtils.getURI(oDir);
      }

      for (var i=0; i<subDirEntry.length; i++) {
        oDir.append(subDirEntry[i]);
      }

      if (oDir.exists() && oDir.isDirectory()) {
        var entries = oDir.directoryEntries;

        while (entries.hasMoreElements()) {
          var currFile = entries.getNext();
          currFile.QueryInterface(Components.interfaces.nsILocalFile);

          if (!currFile.isDirectory()) {
            var resultRec = {};
            resultRec.filepath = currFile.path;
            resultRec.type = MafUtils.getMIMETypeForURI(MafUtils.getURI(currFile));
            resultRec.originalurl = MafUtils.getURI(currFile);
            resultRec.originalurl = resultRec.originalurl.substring(indexFilesRootURI.length, resultRec.originalurl.length);
            resultRec.id = "";

            result.push(resultRec);

          } else {
            var newSubDir = new Array();
            for (var j=0; j<subDirEntry.length; j++) {
              newSubDir[newSubDir.length] = subDirEntry[j];
            }
            newSubDir[newSubDir.length] = currFile.leafName;
            subDirList[subDirList.length] = newSubDir;
          }
        }

      }
    }

    return result;
  },

  /**
   * Loads meta-data available from the saved archive
   */
  _getMainFileMetaData: function(sourcepath) {

    var indexrdffile = Components.classes["@mozilla.org/file/local;1"]
                          .createInstance(Components.interfaces.nsILocalFile);
    indexrdffile.initWithPath(sourcepath);

    var uriPath = MafUtils.getURI(indexrdffile.nsIFile);

    indexrdffile.append("index.rdf");

    return this._getMetaDataFrom(indexrdffile, uriPath);
  },

  /**
   * Tries to read the data from the RDF for a specific file.
   */
  _getMetaDataFrom: function(sourcefile, resourcePath) {
    var result = {};
    result.title = "Unknown";
    result.originalurl = "Unknown";
    result.archivetime = "Unknown";
    result.indexfilename = "index.html";


    var mdatasource;
    // If loading the data source is a problem, we've probably loaded it already
    try {
      mdatasource = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"]
                        .createInstance(Components.interfaces.nsIRDFRemoteDataSource);
      mdatasource.Init(MafUtils.getURI(sourcefile.nsIFile));
      mdatasource.Refresh(true);
      mdatasource.QueryInterface(Components.interfaces.nsIRDFDataSource);
    } catch(e) {
      mdatasource = gRDFService.GetDataSource(MafUtils.getURI(sourcefile.nsIFile));
    }


    try {
      // This archive's unique archive URL resource
      var rootSubject = gRDFService.GetResource("urn:root");

      // Get the title
      var predicate = gRDFService.GetResource(MAFNamespace + "title");

      var titletarget = mdatasource.GetTarget(rootSubject, predicate, true);
      titletarget = titletarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result.title = titletarget.Value;
      if (resourcePath.length < result.title.length) {
        // If the resource is in the result, remove it
        if (result.title.substring(0, resourcePath.length) == resourcePath) {
          result.title = result.title.substring(resourcePath.length, result.title.length);
        }
      }

      // Get the original url
      predicate = gRDFService.GetResource(MAFNamespace + "originalurl");

      var originalurltarget = mdatasource.GetTarget(rootSubject, predicate, true);
      originalurltarget = originalurltarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result.originalurl = originalurltarget.Value;
      if (resourcePath.length < result.originalurl.length) {
        // If the resource is in the result, remove it
        if (result.originalurl.substring(0, resourcePath.length) == resourcePath) {
          result.originalurl = result.originalurl.substring(resourcePath.length, result.originalurl.length);
        }
      }

      // Get the archive time
      predicate = gRDFService.GetResource(MAFNamespace + "archivetime");

      var archivetimetarget = mdatasource.GetTarget(rootSubject, predicate, true);
      archivetimetarget = archivetimetarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result.archivetime = archivetimetarget.Value;
      if (resourcePath.length < result.archivetime.length) {
        // If the resource is in the result, remove it
        if (result.archivetime.substring(0, resourcePath.length) == resourcePath) {
          result.archivetime = result.archivetime.substring(resourcePath.length, result.archivetime.length);
        }
      }

      // Get the index file name
      predicate = gRDFService.GetResource(MAFNamespace + "indexfilename");

      var indexfilenametarget = mdatasource.GetTarget(rootSubject, predicate, true);
      indexfilenametarget = indexfilenametarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result.indexfilename = indexfilenametarget.Value;
      if (resourcePath.length < result.indexfilename.length) {
        // If the resource is in the result, remove it
        if (result.indexfilename.substring(0, resourcePath.length) == resourcePath) {
          result.indexfilename = result.indexfilename.substring(resourcePath.length, result.indexfilename.length);
        }
      }

    } catch (e) {

    }

    return result;
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

  _uidToLocalFilenameMap: null,

  // We need to create an instance of the "@mozilla.org/maf/dictionary;1"
  //  class, but we must be sure it is already registered; thus the getter.
  get uidToLocalFilenameMap() {
    if (this._uidToLocalFilenameMap === null) {
      this._uidToLocalFilenameMap =
                            Components.classes["@mozilla.org/maf/dictionary;1"]
                            .createInstance(Components.interfaces.nsIDictionary);
    }
    return this._uidToLocalFilenameMap;
  },

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

  onContentStart: function(contentType, contentId, contentLocation, relativeContentLocation) {
    this.destPathWithFolder = this.destpath;

    var extensionType = "";
    if (this.isindex) {
      if (contentType != "") { // If there's a type use it
        extensionType = MafUtils.getExtensionByType(contentType);
        // If the service has no idea what the extension should be
        if (extensionType == "") {
          // Assume html
          extensionType = ".html";
        }
        this.filename = "index" + extensionType;
      } else { // Otherwise assume it's html
        this.filename = "index.html";
        extensionType = ".html";
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

        var relativeIndexFilesUsed = false;

        if (relativeContentLocation.startsWith("index_files/")) {
          relativeContentLocation = relativeContentLocation.substring("index_files/".length,
                                    relativeContentLocation.length);
          relativeIndexFilesUsed = true;
        }


        var defaultFilename = MafUtils.getDefaultFileName("", url);

        if (relativeIndexFilesUsed) {
          var subFolders = relativeContentLocation;

          var subDir = this.destPathWithFolder;

          while (subFolders.indexOf("/") > -1) {
            var subFolder = subFolders.substring(0, subFolders.indexOf("/"));
            subFolders = subFolders.substring(subFolders.indexOf("/") + 1, subFolders.length);

            subDir = MafUtils.appendToDir(subDir, subFolder);
            MafUtils.createDir(subDir);
          }

          this.destPathWithFolder = subDir;

          defaultFilename = subFolders;
        }

        // If there's no extension, add one based on type
        if (defaultFilename.indexOf(".") == -1) {
          extensionType = MafUtils.getExtensionByType(contentType);
          defaultFilename += extensionType;
        } else {
          extensionType = defaultFilename.substring(defaultFilename.lastIndexOf("."),
                            defaultFilename.length).toLowerCase();
        }

        this.filename = MafUtils.getUniqueFilename(this.destPathWithFolder, defaultFilename);

      } else {
        // Otherwise base it on the content type
        extensionType = MafUtils.getExtensionByType(contentType);
        this.filename = MafUtils.getUniqueFilename(this.destPathWithFolder,
                            "index" + extensionType);
      }
    }

    this.destfile = MafUtils.appendToDir(this.destPathWithFolder, this.filename);

    // In framed pages the content type may be application/octet-stream instead of
    // text/html. To cater for this assume the MIME service is working and has
    // identified the extension to use as either html or htm.
    if ((contentType.toLowerCase().indexOf("text/html") >= 0) ||
        (extensionType.toLowerCase() == ".html") ||
        (extensionType.toLowerCase() == ".htm")) {
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
      this.createBinaryFile();
    } else {
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


  if (gRDFService == null) {
    gRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                     .getService(Components.interfaces.nsIRDFService);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafMhtHandlerService == null) {
    MafMhtHandlerService = new MafMhtHandlerServiceClass();
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
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

