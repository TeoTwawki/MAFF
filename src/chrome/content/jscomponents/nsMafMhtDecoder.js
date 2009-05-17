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

// Provides MAF Mht Decoder Object


/**
 * The MAF Mht Decoder.
 */

function MafMhtDecoderClass() {

};

MafMhtDecoderClass.prototype = {

  content : "",

  contentHeaders : "",

  contentBody : "",

  rootLocation : 0,

  rootLocationSet : false,

  body : new Array(),

  initWithFile: function(file) {
    try {
      var f = file.QueryInterface(Components.interfaces.nsILocalFile);

      var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                               .createInstance(Components.interfaces.nsIFileInputStream);
      fileInputStream.init(f, 0x01, 0444, null);

      var scriptableFileInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                         .createInstance(Components.interfaces.nsIScriptableInputStream);
      scriptableFileInputStream.init(fileInputStream);

      this.content = scriptableFileInputStream.read(f.fileSize);

      scriptableFileInputStream.close();
      fileInputStream.close();
    } catch (e) {
      mafdebug(e);
    }

    this.parse();
  },

  initWithURL: function(url) {
    // Should get MHT from network, read it and store the content in attribute
    // TODO: Implement
  },

  init: function(content) {
    this.content = content;
    this.parse();
  },

  /**
   * Parses MHT files getting certain types of data and splitting
   * up multipart related into an array
   */
  parse: function() {
    var headersAndBody = this._parseOutHeadersAndBody(this.content);

    this.contentHeaders = headersAndBody[0];
    this.contentBody = headersAndBody[1];

    this.headers = MimeSupport.collectHeadersFromSection(this.contentHeaders);
    this.contentHeaders = "";
    this.parseBody();
    this.checkRootLocation();
  },

  checkRootLocation: function() {
    // If the root location wasn't explicitly set using
    // content location or id, see if there is more than
    // one part to be decoded and try to find the root part
    // using the content type.
    if ((!this.rootLocationSet) && (this.body.length > 1)) {
      var thisContentType = this.getHeaderValue("content-type");

      var ctData = this._convertContentType(thisContentType);
      var needleType = "";

      for (var i=0; i<ctData.length; i++) {
        var entry = ctData[i];
        if (Maf_String_trim(entry.name).toLowerCase() == "type") {
          needleType = Maf_String_trim(entry.value).toLowerCase();
        }
      }

      if (needleType != "") {
        // Looking for body part with type: needleType
        for (var i=0; i<this.body.length; i++) {
          var bodyContentType = this.getPartNo(i).getHeaderValue("content-type");
          var bodyContentTypeArray = bodyContentType.split(";");
          for (var j=0; j<bodyContentTypeArray.length; j++) {
             // Found needleType
             if ((Maf_String_trim(bodyContentTypeArray[j]).toLowerCase()) == needleType) {
               this.rootLocation = i;
               this.rootLocationSet = true;
               break; break;
             }
          }
        }
      }
    }
  },

  _parseOutHeadersAndBody: function(content) {
    var result = new Array();
    result[0] = "";
    result[1] = "";

    if (content.indexOf("\r\n\r\n") != -1) {
      result[0] = content.substring(0, content.indexOf("\r\n\r\n"));
      result[1] = content.substring(content.indexOf("\r\n\r\n") + 4, content.length);
    } else if (content.indexOf("\n\n") != -1) {
      result[0] = content.substring(0, content.indexOf("\n\n"));
      result[1] = content.substring(content.indexOf("\n\n") + 2, content.length);
    } else {
      result[1] = content;
    }

    return result;
  },

  parseBody: function() {
    var abody = new Array();

    var contentType = this.getHeaderValue("content-type");
    var baseContentLocation = this.getHeaderValue("content-location"); // Base content location to be used by part

    // If the content type isn't multipart
    if ((contentType.indexOf("multipart")) == -1) {
      // Only one part
      var part = this.contentBody;

      abody[abody.length] = part;
    } else {
      // Get the boundary string and split the parts up
      var ctData = this._convertContentType(contentType);
      var boundary = ""; // Boundary to split content by
      var start = ""; // Explicit start content id
      for (var i=0; i<ctData.length; i++) {
        var entry = ctData[i];
        if (Maf_String_trim(entry.name).toLowerCase() == "boundary") {
          boundary = entry.value;
        } else if (Maf_String_trim(entry.name).toLowerCase() == "start") {
          start = entry.value;
        }
      }

      // If there's no start part set, use the base content location so
      // the root part would be found using matching content locations first
      // and matching content types second.
      if (start == "") { start = baseContentLocation; }

      // If we have a boundary, split
      if (boundary != "") {
        // Remove the first boundary and the last boundary marker
        var contentBodyLessBoundaryEnd = this.contentBody;
        var boundaryEndIndex = contentBodyLessBoundaryEnd.indexOf("--" + boundary + "--");
        var boundaryStartIndex = contentBodyLessBoundaryEnd.indexOf("--" + boundary) + boundary.length + 2;
        if (boundaryEndIndex > 0) {
          contentBodyLessBoundaryEnd = contentBodyLessBoundaryEnd.substring(boundaryStartIndex, boundaryEndIndex);
        }

        var contentParts = contentBodyLessBoundaryEnd.split("--" + boundary);

        for (var i=0; i<contentParts.length; i++) {
          var currentPart = contentParts[i];
          var result = new MafMhtDecoderClass();
          result.init(currentPart);

          // If there's a base content location, make sure that if the current part
          //   has a content location it is absolute
          if (baseContentLocation != "") {
            this._resolvePartToBaseContentLocation(result, baseContentLocation);
          }

          // If current part has a content id or content location
          // that matches start, make that the root
          if (start != "") {
            if (this._isStartPart(result, start)) {
              this.rootLocation = i;
              this.rootLocationSet = true;
            }
          }

          abody[abody.length] = result;
        }

        // If there's a base content location, make sure it's added to the root part
        if (baseContentLocation != "") {
          var rootpart = abody[this.rootLocation];
          this._addContentLocationToRootPart(rootpart, baseContentLocation);
        }

      }
    }

    this.body = abody;
  },

  _addContentLocationToRootPart: function(currentPart, baseContentLocation) {
    if (baseContentLocation != "") {
      if (!currentPart.getHeaderValue("Content-Location")) {
        currentPart.setHeaderValue("Content-Location", baseContentLocation);
      }
    }
  },

  _resolvePartToBaseContentLocation: function(currentPart, baseContentLocation) {
    var result = currentPart;
    if (baseContentLocation != "") {
      var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                            .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseContentLocation;

      var partContentLocation = currentPart.getHeaderValue("Content-Location");

      //  If there's a content location
      if (partContentLocation != "") {
        currentPart.setHeaderValue("X-MAF-Content-Location", partContentLocation);
        // Resolve against the baseContentLocation
        partContentLocation = obj_baseUrl.resolve(partContentLocation);
        currentPart.setHeaderValue("Content-Location", partContentLocation);
      }
    }
  },

  _isStartPart: function(contentPart, startid) {
    return startid == contentPart.getHeaderValue("Content-ID") ||
           startid == contentPart.getHeaderValue("Content-Location");
  },

  _convertContentType: function(contentType) {
    var result = new Array();
    var ctArray = contentType.split(";");

    // Get the name value pairs
    for (var i=0; i<ctArray.length; i++) {
      var entry = Maf_String_trim(ctArray[i]);
      if (entry.indexOf("=") > -1) {
        var name = entry.substring(0, entry.indexOf("="));
        var value = entry.substring(entry.indexOf("=") + 1, entry.length);
        // Remove the quotes
        if (value.length > 1 && value[0] == '"' && value[value.length - 1] == '"') {
          value = value.substring(1, value.length - 1);
        }
        var record = new headerRecClass(name, value);
        result.push(record);
      }
    }

    return result;
  },

  getHeaderValue: function(headerName) {
    return this.headers[Maf_String_trim(headerName).toLowerCase()] || "";
  },

  setHeaderValue: function(headerName, headerValue) {
    this.headers[Maf_String_trim(headerName).toLowerCase()] = headerValue;
  },

  noOfParts: function() {
    return this.body.length;
  },

  getPartNo: function(index) {
    if (this.noOfParts() == 1) {
      return this;
    } else {
      return this.body[index]
    }
  },

  rootPartNo: function() {
    // return the root part number, int
    return this.rootLocation;
  },

  getContent: function(callback) {
    // If there is only one part, then decode and callback
    if (this.noOfParts() == 1) {
       var contentType = this.getHeaderValue("Content-Type");
       var contentId = this.getHeaderValue("Content-Id");
       contentId = Maf_String_replaceAll(Maf_String_replaceAll(contentId, ">", ""), "<", "");
       var contentLocation = this.getHeaderValue("Content-Location");
       var relativeContentLocation = this.getHeaderValue("x-maf-content-location");

       callback.onContentStart(contentType, contentId, contentLocation, relativeContentLocation);

       var encoding = Maf_String_trim(this.getHeaderValue("Content-Transfer-Encoding")).toLowerCase();

       if (encoding == "quoted-printable") {
         callback.onContent(MimeSupport.decodeQuotedPrintable(this.contentBody));
       } else if (encoding == "base64") {
         callback.onContent(MimeSupport.decodeBase64(this.contentBody));
       } else {
         // No decoding
         callback.onContent(this.contentBody);
       }
       callback.onContentComplete();
    }
  }
};

function headerRecClass(headerName, headerValue) {
  this.name = headerName;
  this.value = headerValue;
};