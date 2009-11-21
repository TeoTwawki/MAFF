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

// Provides MAF MHT Handler services

/**
 * The MAF MHT Handler.
 */
function MafMhtHandler() {

}

MafMhtHandler.prototype = {

  extractArchive: function(archivefile, destpath, datasource) {
    var end;

    try {

      var decoder = new MafMhtDecoderClass();
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
              var thisContentHandler = new extractContentHandlerClass(destpath, state, datasource, false, this);
              thisPart.getContent(thisContentHandler);
            }
          } catch(e) {

          }
        }
      }
    }

    if (!this.xmafused) {
      for (var i=0; i<state.htmlFiles.length; i++) {

        var thisPage = MafUtils.readFile(state.htmlFiles[i]);

        try {
          var baseUrl = state.baseUrl[i];
          if (baseUrl != "") {
            var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                                  .createInstance(Components.interfaces.nsIURL);
            obj_baseUrl.spec = baseUrl;
          } else {
            var obj_baseUrl = null;
          }

          var entireSourceFile;
          if (state.htmlIsCSS[i]) {
            entireSourceFile = new CssSourceFragment(thisPage);
          } else {
            entireSourceFile = new HtmlSourceFragment(thisPage);
          }

          for (var curFragment in entireSourceFile) {
            if (curFragment instanceof UrlSourceFragment) {

              var originalUrl = curFragment.urlSpec;

              // Retrieve absolute URL if possible
              if (obj_baseUrl) {
                originalUrl = obj_baseUrl.resolve(originalUrl);
              }

              // Convert "cid:" scheme to lowercase
              if (originalUrl.slice(0, "cid:".length).toLowerCase() == "cid:") {
                originalUrl = "cid:" + originalUrl.substring("cid:".length, originalUrl.length);
              }

              // Cater for Hashes
              var baseUrl = originalUrl.split("#")[0];
              var leftOver = originalUrl.split("#")[1];

              if (state.uidToLocalFilenameMap.hasOwnProperty(baseUrl)) {
                try {
                  var newBaseUrlValue = state.uidToLocalFilenameMap[baseUrl];
                  originalUrl = MafUtils.getURIFromFilename(
                                           newBaseUrlValue);
                } catch(e) {
                  originalUrl = baseUrl;
                }
                if (typeof(leftOver) != "undefined") {
                  originalUrl += "#" + leftOver;
                }
              }

              curFragment.urlSpec = originalUrl;
            }
          }
          thisPage = entireSourceFile.sourceData;

          MafUtils.deleteFile(state.htmlFiles[i]);
          MafUtils.createFile(state.htmlFiles[i], thisPage);
        } catch(e) {
          mafdebug(e);
        }
      }
    }
  },


  _addSubjectAndDateMetaData: function(decoder, datasource) {
    this.xmafused = !!decoder.getHeaderValue("x-maf");
    if (this.xmafused || decoder.getHeaderValue("x-maf-version")) {
      // If the archive was created by MAF, the subject is saved as UTF-8
      var octets = decoder.getHeaderValue("subject");
      var decodedText = ""
      var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
       createInstance(Ci.nsIScriptableUnicodeConverter);
      try {
        // Convert the octets to characters using the specified charset
        converter.charset = "utf-8";
        decodedText = converter.ConvertToUnicode(octets);
      } catch (e) {
        // Convert the octets to characters using the specified charset
        converter.charset = "iso-8859-1";
        decodedText = converter.ConvertToUnicode(octets);
      }
      datasource.title = decodedText || "Unknown";
    } else {
      // If the archive was created by another browser, probably the subject is
      //  properly encoded as an unstructured value
      datasource.title = MimeSupport.parseUnstructuredValue(
       decoder.getHeaderValue("subject")) || "Unknown";
    }
    datasource.dateArchived = decoder.getHeaderValue("date") || null;
  }
};


function extractContentHandlerStateClass() {

};

extractContentHandlerStateClass.prototype = {

  uidToLocalFilenameMap: {},

  htmlFiles: new Array(),
  htmlIsCSS: new Array(),

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
    var dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(this.destpath);

    var extensionType = "";
    contentType = contentType.replace(/\s*;.*/, "").toLowerCase();
    if (!contentType) {
      contentType = this.isindex ? "text/html" : "application/octet-stream";
    }
    resource = new PersistResource();
    resource.mimeType = contentType;
    resource.contentLocation = this.isindex ? "index" : contentLocation;
    if (!this.state.folder) {
      this.state.folder = new PersistFolder(dir);
    }
    this.state.folder.addUnique(resource);
    this.destfile = resource.file.path;
    if (this.isindex) {
      this.datasource.indexLeafName = resource.file.leafName;
      this.datasource.originalUrl = contentLocation || "Unknown";
    } else {
      if (Maf_String_startsWith(relativeContentLocation, "index_files/")) {
        var ioService = Cc["@mozilla.org/network/io-service;1"].
         getService(Ci.nsIIOService);
        var folderUri = ioService.newFileURI(dir).QueryInterface(Ci.nsIURL);
        var fileUrl = ioService.newURI(relativeContentLocation, null, folderUri);
        // The following function checks whether fileUrl is located under the
        //  folder represented by folderUri
        if (folderUri.getCommonBaseSpec(fileUrl) !== folderUri.spec) {
          throw new Components.Exception("Invalid relative content location");
        }
        this.destfile = fileUrl.QueryInterface(Ci.nsIFileURL).file.path;
      }
    }

    // In framed pages the content type may be application/octet-stream instead of
    // text/html. To cater for this assume the MIME service is working and has
    // identified the extension to use as either html or htm.
    if ((contentType.toLowerCase().indexOf("text/html") >= 0) ||
        (contentType.toLowerCase().indexOf("text/css") >= 0) ||
        (extensionType.toLowerCase() == ".html") ||
        (extensionType.toLowerCase() == ".htm")) {
      this.state.htmlFiles.push(this.destfile);
      this.state.htmlIsCSS.push((contentType.toLowerCase().indexOf("text/css") >= 0));
      this.state.baseUrl.push(contentLocation);
    }

    if (contentLocation != "") {
      this.state.uidToLocalFilenameMap[contentLocation] = this.destfile;
    }

    if (contentId != "") {
      this.state.uidToLocalFilenameMap["cid:" + contentId] = this.destfile;
    }
  },

  onContent: function(data) { this.data += data; },

  onContentComplete: function() {
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
  }
};
