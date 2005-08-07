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

// Provides MAF Mht Decoder Object
// TODO: Optimization: Dictionary holding headers instead of indexed array.

const mafMhtDecoderContractID = "@mozilla.org/libmaf/decoder;1?name=mht";
const mafMhtDecoderCID = Components.ID("{3814ca79-30bc-4ad3-a005-488f05a1dd87}");
const mafMhtDecoderIID = Components.interfaces.nsIMafMhtDecoder;

const mafMhtDecoderHeaderRecIID = Components.interfaces.nsIMafMhtHeaderRec;

var MafStrBundle = null;

/**
 * The MAF Mht Decoder.
 */

function MafMhtDecoderClass() {

};

MafMhtDecoderClass.prototype = {

  PROGID : "Internal MHT Program Extract Handler",

  content : "",

  contentHeaders : "",

  contentBody : "",

  rootLocation : 0,

  rootLocationSet : false,

  body : new Array(),

  headers : new Array(),

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
    this.content = "";

    this.headers = this.parseHeaders(this.contentHeaders);
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
        if ((entry.name).trim().toLowerCase() == "type") {
          needleType = entry.value.trim().toLowerCase();
        }
      }

      if (needleType != "") {
        // Looking for body part with type: needleType
        for (var i=0; i<this.body.length; i++) {
          var bodyContentType = this.getPartNo(i).getHeaderValue("content-type");
          var bodyContentTypeArray = bodyContentType.split(";");
          for (var j=0; j<bodyContentTypeArray.length; j++) {
             // Found needleType
             if ((bodyContentTypeArray[j].trim().toLowerCase()) == needleType) {
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

  parseHeaders: function(unparsedHeaders) {
    var headerLines = unparsedHeaders.split(/\r?\n/);
    // Ensure that values that cross lines end up on only one line
    var normalizedHeaderLines = new Array();

    normalizedHeaderLines = this._normalizeHeaders(headerLines);

    var aheaders = new Array();

    // Get the name value pairs
    for (var i=0; i<normalizedHeaderLines.length; i++) {
      var headerDelimiter = normalizedHeaderLines[i].indexOf(":");
      if (headerDelimiter > 0) {
        var headerName = normalizedHeaderLines[i].substring(0, headerDelimiter).trim();
        var headerValue = normalizedHeaderLines[i].substring(headerDelimiter + 1, normalizedHeaderLines[i].length).trim();
        var headerRec = new headerRecClass(headerName, headerValue);
        aheaders.push(headerRec);
      }
    }

    return aheaders;
  },

  /**
   * Puts headers on a single line with content and removes comments
   */
  _normalizeHeaders: function(headers) {
    var result = new Array();
    var currentHeader = "";
    var currentContent = "";
    var newHeader = "";
    var newContent = "";

    for (var i=0; i<headers.length; i++) {
      newHeader = this._normalizeHeadersGetName(headers[i]).trim();
      newContent = this._normalizeHeadersGetValue(headers[i]).trim();
      //mafdebug("[" + i + "] newHeader:" + newHeader);
      //mafdebug("[" + i + "] newContent:" + newHeader);

      if ((currentHeader == "") && (currentContent == "")) {
        // First header
        //mafdebug("[" + i + "] Current header and content are empty");
        currentHeader = newHeader;
        currentContent = this._removeCommentFromHeader(newHeader, newContent);
      } else {
        if ((currentHeader != "") && (currentContent == "")) {
          //mafdebug("[" + i + "] Current header not empty but content is empty");
          //mafdebug("[" + i + "] Current header:" + currentHeader);
          // Header with empty content
          currentContent = this._removeCommentFromHeader(currentHeader, headers[i].trim());
          //mafdebug("[" + i + "] Current header new content:" + currentContent);
        } else {
          if ((currentHeader != "") && (newHeader == "")) {
            //mafdebug("[" + i + "] Current header not empty but new header is");
            // Content continues
            currentContent += this._removeCommentFromHeader(currentHeader, newContent);
            //mafdebug("[" + i + "] Current header new content:" + currentContent);
          } else {
            if ((currentHeader != "") && (newHeader != "")) {
              //mafdebug("[" + i + "] Current header and new header not empty. Save current, resetting new.");
              // We have a new current
              result[result.length] = currentHeader + ": " + currentContent;
              //mafdebug(currentHeader + ": " + currentContent);
              currentHeader = newHeader;
              currentContent = this._removeCommentFromHeader(newHeader, newContent);
              newHeader = "";
              newContent = "";
            }
          }
        }
      }
    }

    //mafdebug("Out of loop");
    //mafdebug("currentHeader: " + currentHeader);
    //mafdebug("currentContent: " + currentContent);
    //mafdebug("newHeader: " + newHeader);
    //mafdebug("newContent: " + newContent);
    if (currentHeader != "") {
      result[result.length] = currentHeader + ": " + currentContent;
      //mafdebug(currentHeader + ": " + currentContent);
    }

    return result;
  },


  _normalizeHeadersGetName: function(header) {
    var result = "";
    if (header.indexOf(":") > 0) {
      result = header.substring(0, header.indexOf(":"));
    }

    return result;
  },

  _normalizeHeadersGetValue: function(header) {
    var result = header;
    if (header.indexOf(":") > 0) {
      result = header.substring(header.indexOf(":") + 1, header.length);
    }

    return result;
  },

  _removeCommentFromHeader: function(headerName, headerValue) {
    var result = headerValue;

    // Everything after the ; is gone
    if (headerName.trim().toLowerCase() != "content-type") {
      if (result.indexOf(";") > -1) {
        result = result.substring(0, result.indexOf(";"));
      }
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
        if ((entry.name).trim().toLowerCase() == "boundary") {
          boundary = entry.value;
        } else if ((entry.name).trim().toLowerCase() == "start") {
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
          // If there's a base content location, make sure that if the current part
          //   has a content location it is absolute
          if (baseContentLocation != "") {
            currentPart = this._resolvePartToBaseContentLocation(currentPart, baseContentLocation);
          }

          // If current part has a content id or content location
          // that matches start, make that the root
          if (start != "") {
            if (this._isStartPart(currentPart, start)) {
              this.rootLocation = i;
              this.rootLocationSet = true;
            }
          }

          abody[abody.length] = currentPart;
        }

        // If there's a base content location, make sure it's added to the root part
        if (baseContentLocation != "") {
          var rootpart = abody[this.rootLocation];
          rootpart = this._addContentLocationToRootPart(rootpart, baseContentLocation);
          abody[this.rootLocation] = rootpart;
        }

      }
    }

    this.body = abody;
    this.contentBody = "";
  },

  _addContentLocationToRootPart: function(currentPart, baseContentLocation) {
    var result = currentPart;
    if (baseContentLocation != "") {
      // Parse the headers
      var headersAndBody = this._parseOutHeadersAndBody(currentPart);

      // Get the headers
      var headers = this.parseHeaders(headersAndBody[0]);

      var hasContentLocationAlready = false;

      // Get the part's content location
      for (var i=0; i<headers.length; i++) {
        var entry = headers[i];
        if ((entry.name).trim().toLowerCase() == "content-location") {
          hasContentLocationAlready = true;
          break;
        }
      }

      //  If there's no content location
      if (!hasContentLocationAlready) {
        // Reconstruct headers
        var headerStr = "";
        for (var i=0; i<headers.length; i++) {
          var entry = headers[i];
          headerStr += entry.name + ": " + entry.value + "\r\n";
        }
        headerStr += "Content-Location: " + baseContentLocation + "\r\n";

        // Replace part headers with new headers in new part string
        result = headerStr + "\r\n" + headersAndBody[1];
      }
    }

    return result;
  },

  _resolvePartToBaseContentLocation: function(currentPart, baseContentLocation) {
    var result = currentPart;
    if (baseContentLocation != "") {
      var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                            .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseContentLocation;

      // Parse the headers
      var headersAndBody = this._parseOutHeadersAndBody(currentPart);

      // Get the headers
      var headers = this.parseHeaders(headersAndBody[0]);

      var partContentLocation = "";

      // Get the part's content location
      for (var i=0; i<headers.length; i++) {
        var entry = headers[i];
        if ((entry.name).trim().toLowerCase() == "content-location") {
          partContentLocation = entry.value;
          break;
        }
      }

      //  If there's a content location
      if (partContentLocation != "") {
        var relativeContentLocation = partContentLocation;

        // Resolve against the baseContentLocation
        partContentLocation = obj_baseUrl.resolve(partContentLocation);

        // Reconstruct headers
        var headerStr = "";
        for (var i=0; i<headers.length; i++) {
          var entry = headers[i];
          if ((entry.name).trim().toLowerCase() == "content-location") {
            headerStr += entry.name + ": " + partContentLocation + "\r\n";
            headerStr += "x-maf-content-location: " + relativeContentLocation + "\r\n";
          } else {
            headerStr += entry.name + ": " + entry.value + "\r\n";
          }
        }

        // Replace part headers with new headers in new part string
        result = headerStr + "\r\n" + headersAndBody[1];
      }
    }

    return result;
  },

  _isStartPart: function(contentPart, startid) {
    var result = false;
    try {
      var partHeaders = "";
      if (contentPart.indexOf("\r\n\r\n") != -1) {
        partHeaders = contentPart.substring(0, contentPart.indexOf("\r\n\r\n"));
      } else if (contentPart.indexOf("\n\n") != -1) {
        partHeaders = contentPart.substring(0, contentPart.indexOf("\n\n"));
      }

      var parsedPartHeaders = this.parseHeaders(partHeaders);
      for (var i=0; i<parsedPartHeaders.length; i++) {
        var entry = parsedPartHeaders[i];
        if ((entry.name.trim().toLowerCase() == "content-id") ||
            (entry.name.trim().toLowerCase() == "content-location")) {
          if (entry.value == startid) {
            result = true;
            break;
          }
        }
      }

    } catch(e) {

    }

    return result;
  },

  _convertContentType: function(contentType) {
    var result = new Array();
    var ctArray = contentType.split(";");

    // Get the name value pairs
    for (var i=0; i<ctArray.length; i++) {
      var entry = ctArray[i].trim();
      if (entry.indexOf("=") > -1) {
        var name = entry.substring(0, entry.indexOf("="));
        var value = entry.substring(entry.indexOf("=") + 1, entry.length);
        // Remove the quotes
        value = value.substring(1, value.length - 1);
        var record = new headerRecClass(name, value);
        result.push(record);
      }
    }

    return result;
  },

  getHeaders: function() {
    // Result is a nsISimpleEnumerator
    return (new headerEnumerator(this.headers)).QueryInterface(Components.interfaces.nsISimpleEnumerator);
  },

  getHeaderValue: function(headerName) {
    var result = "";
    try {
      var hnames = this.getHeaders();
      while (hnames.hasMoreElements()) {
        var header = hnames.getNext();
        if ((header.name.trim().toLowerCase()) == headerName.trim().toLowerCase()) {
          result = header.value;
          break;
        }
      }
    } catch(e) {
      mafdebug(e);
    }

    return result;
  },

  noOfParts: function() {
    return this.body.length;
  },

  getPartNo: function(index) {
    if (this.noOfParts() == 1) {
      return this;
    } else {
      // return new MafMhtDecoderClass inited with the content of the part
      var result = new MafMhtDecoderClass();
      result.init(this.body[index]);
      return result;
    }
  },

  rootPartNo: function() {
    // return the root part number, int
    return this.rootLocation;
  },

  getContent: function(callback) {
    // If there is only one part, then decode and callback
    if (this.noOfParts() == 1) {
       callback.QueryInterface(Components.interfaces.nsIMafMhtDecoderContentHandler);
       var contentType = this.getHeaderValue("Content-Type");
       var contentId = this.getHeaderValue("Content-Id");
       contentId = contentId.replaceAll(">", "").replaceAll("<", "");
       var contentLocation = this.getHeaderValue("Content-Location");
       var relativeContentLocation = this.getHeaderValue("x-maf-content-location");

       callback.onContentStart(contentType, contentId, contentLocation, relativeContentLocation);

       var encoding = this.getHeaderValue("Content-Transfer-Encoding").trim().toLowerCase();

       if ((encoding == "quoted-printable") || (encoding == "base64")) {
         // Decode with encoding and callback
         new contentDecoderClass(encoding, this.body[0], contentType, callback);
       } else {
         // No decoding
         callback.onContent(this.body[0]);
         callback.onContentComplete();
       }
    }
  },

  decodeQuotedPrintableString: function(source) {
    var decoder = new contentDecoderClass(null, null, null, null);
    return decoder._decodeQuotedPrintable(source);
  },


  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtDecoderIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};

function headerEnumerator(pheaders) {
  this.headers = pheaders;
  this.index = -1;
};

headerEnumerator.prototype = {

  getNext: function() {
    this.index += 1;
    return this.headers[this.index];
  },

  hasMoreElements: function() {
    return (this.index < (this.headers.length - 1));
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsISimpleEnumerator) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }
};

function headerRecClass(headerName, headerValue) {
  this.name = headerName;
  this.value = headerValue;
};

headerRecClass.prototype = {

  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtDecoderHeaderRecIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }
};

function contentDecoderClass(encoding, content, contentType, callback) {
  this.encoding = encoding;
  this.content = content;
  this.callback = callback;
  this.contentType = contentType;

  this.startDecoding();
};

contentDecoderClass.prototype = {

  base64s: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

  startDecoding: function() {
    if (this.encoding == "quoted-printable") {
      this.callback.onContent(this._decodeQuotedPrintable(this.content));
    }

    if (this.encoding == "base64") {
      this.callback.onBinaryContent(this._decodeBase64((this.content.split(/\r?\n/)).join("")));
    }
    try {
      this.callback.onContentComplete();
    } catch(e) {

    }
  },

  /**
   * Copied from FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _decodeBase64: function(encodedString) {
    var result = new Array();

    try {
      var bits, decOut = new Array(), i = 0;
      for(; i<encodedString.length; i += 4) {
        bits = (this.base64s.indexOf(encodedString.charAt(i)) & 0xff) <<18 |
               (this.base64s.indexOf(encodedString.charAt(i +1)) & 0xff) <<12 |
               (this.base64s.indexOf(encodedString.charAt(i +2)) & 0xff) << 6 |
               this.base64s.indexOf(encodedString.charAt(i +3)) & 0xff;

        decOut.push((bits & 0xff0000) >>16);
        decOut.push((bits & 0xff00) >>8);
        decOut.push(bits & 0xff);
      }
      if(encodedString.charCodeAt(i -2) == 61)
        undecOut=decOut.slice(0, decOut.length -2);
      else if(encodedString.charCodeAt(i -1) == 61)
        undecOut=decOut.slice(0, decOut.length -1);
      else undecOut=decOut;

      result = undecOut;
    } catch(e) {
      mafdebug(e);
    }

    return result;
  },

  /**
   * Decode quoted printable text.
   */
  _decodeQuotedPrintable: function(encodedString) {
    var result;

    var decodedStrObj = new Object();

    result = encodedString;

    if (this.contentType != null) {
      // Loose check to see if charset is UTF
      // Should really parse contentType, get charset and check that.
      if (this.contentType.toLowerCase().indexOf("utf-") > -1) {
        if (result.startsWith("=EF=BB=BF")) {
          // Remove the three bytes
          result = result.substring("=EF=BB=BF".length, result.length);
        }
      }
      // Only do this content type check once.
      this.contentType = null;
    }

    if (!this.canNativeDecodeQuotedPrintable(result, decodedStrObj)) {

      // = sign followed by new line, replaced by nothing.
      result = result.replace(/=\r?\n/g, "");

      var equalsArray = result.split("=");
      var newresult = equalsArray[0];
       for (var i=1; i<equalsArray.length; i++) {
        if (equalsArray[i].length >= 2) {
          newresult += this._hexToDec(equalsArray[i].substring(0,2));
          if (equalsArray[i].length > 2) {
            newresult += equalsArray[i].substring(2,equalsArray[i].length);
          }
        }
      }

      return newresult;
    } else {
      return decodedStrObj.content;
    }
  },

  canNativeDecodeQuotedPrintable: function(source, decodedStrObj) {
    var result = true;

    try {
      // Instantiate a native decoder
      var nativeDecoderObj = Components.classes["@ottley.org/libmafbin/mhtmlcoders;1"]
                                .createInstance(Components.interfaces.nsIMafMhtmlCoder);

      decodedStrObj.content = nativeDecoderObj.decodeQuotedPrintable(source);

      nativeDecoderObj = null;

    } catch (e) {
      // If anything goes wrong use the non-native decoder
      result = false;
    }

    return result;
  },

  /**
   * Convert a hex digit into decimal
   */
  _deHex: function(hexDigit) {
    return("0123456789ABCDEF".indexOf(hexDigit));
  },

  /**
   * Convert two digit hex code to ascii character
   */
  _hexToDec: function(hexString) {
    return String.fromCharCode((this._deHex(hexString.substring(0,1)) << 4) + this._deHex(hexString.substring(1,2)));
  }
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

var MAFMhtDecoderFactory = new Object();

MAFMhtDecoderFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafMhtDecoderIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }
    
  return (new MafMhtDecoderClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFMhtDecoderModule = new Object();

MAFMhtDecoderModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafMhtDecoderCID,
                                  "Maf MHT Decoder JS Component",
                                  mafMhtDecoderContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFMhtDecoderModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafMhtDecoderCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFMhtDecoderFactory;
};

MAFMhtDecoderModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFMhtDecoderModule;
};

