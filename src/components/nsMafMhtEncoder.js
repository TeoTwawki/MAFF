/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.5.0
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

// Provides MAF Mht Encoder Object

const mafMhtEncoderContractID = "@mozilla.org/libmaf/encoder;1?name=mht";
const mafMhtEncoderCID = Components.ID("{1a5c8698-b7a4-44af-87f4-38831fb369df}");
const mafMhtEncoderIID = Components.interfaces.nsIMafMhtEncoder;

const qpEncodeTimerDelay = 10;
const fileEncodeTimerDelay = 100;
const readBufferSize = 1024 * 10; // 10K Read buffer

var MafStrBundle = null;

/**
 * The MAF Mht Encoder.
 */

function MafMhtEncoderClass() {
  this.filelist = new Array();
}

MafMhtEncoderClass.prototype = {

  PROGID : "Internal MHT Program Archive Handler",

  from : "maf@mozdev.org",

  subject : "",

  date : "",

  base64s: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

  /** Characters that are to be unaltered during quoted printable encoding */
  QPENCODE_UNALTERED: String.fromCharCode(32) + String.fromCharCode(60) + String.fromCharCode(62)
                      + String.fromCharCode(126),

  /** Characters that are to be unaltered during quoted printable encoding if they are the last char*/
  QPENCODE_UNALTEREDEND: String.fromCharCode(33) + String.fromCharCode(60) + String.fromCharCode(62)
                         + String.fromCharCode(126),

  /** The maximum number of characters before line wrap */
  QPENCODE_MAXLINESIZE: 76,

  READ_BUFFER_SIZE: readBufferSize,

  addFile: function(source, type, location, id) {
    var record = { };
    record.source = source;
    record.type = type;
    record.location = location;
    record.id = id;
    this.filelist.push(record);
  },

  encodeTo: function(dest) {
    if (this.filelist.length > 0) {

      if (!dest.exists()) {
        dest.create(0x00, 0644);
      }

      var state = new encodingTimerState();
      state.encoder = this;
      state.i = 0;
      state.boundaryString = "";
      state.dest = dest;

      try {
        var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                            .createInstance(Components.interfaces.nsIFileOutputStream);
        oTransport.init( dest, 0x04 | 0x08 | 0x10, 064, 0 );
        state.oTransport =  oTransport;

        var MHTContentString = "";
        if (this.from != "" ) { MHTContentString += "From: " + this.from + "\r\n"; }
        if (this.subject != "") { MHTContentString += "Subject: " + this.subject + "\r\n"; }
        if (this.date != "") { MHTContentString += "Date: " + this.date + "\r\n"; }
        MHTContentString += "MIME-Version: 1.0\r\n";

        if (this.filelist.length > 1) {
          if (this.filelist[0].location != "") {
            MHTContentString += "Content-Location: " + this.filelist[0].location + "\r\n";
          }
          if (this.filelist[0].id != "") {
            MHTContentString += "Content-ID: " + this.filelist[0].id + "\r\n";
          }
          var boundaryString = this._getBoundaryString();

          MHTContentString += "Content-Type: multipart/related;\r\n";
          MHTContentString += "\tboundary=\"" + boundaryString + "\";\r\n"
          MHTContentString += "\ttype=\"" + this.filelist[0].type + "\"\r\n";
          MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.4.1\r\n";
          MHTContentString += "\r\nThis is a multi-part message in MIME format.\r\n";

          oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

          state.boundaryString = boundaryString;

        } else {
          MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.4.1\r\n";
          oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

        }


      } catch (e) {
        mafdebug(e);
      }
    }


    var timer = Components.classes["@mozilla.org/timer;1"]
                 .createInstance(Components.interfaces.nsITimer);
    state.timer = timer;
    timer.initWithCallback(state, fileEncodeTimerDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

  },

  _getEncodedFile: function(index, oTransport) {
    var result = "";

    try {
      result += "Content-Type: " + this.filelist[index].type + "\r\n";

      var contentEncoding = this._getContentEncodingByType(this.filelist[index].type);
      result += "Content-Transfer-Encoding: " + contentEncoding + "\r\n";
      if (this.filelist[index].location != "") {
        result += "Content-Location: " + this.filelist[index].location + "\r\n";
      }
      if (this.filelist[index].id != "") {
        result += "Content-ID: " + this.filelist[index].id + "\r\n";
      }
      result += "\r\n";

      oTransport.write(result, result.length);
      result = "";

      var srcFile = "";

      if (contentEncoding == "quoted-printable") {
        //srcFile = this._readTextFile(this.filelist[index].source);
        this._encodeQuotedPrintable(this.filelist[index].source, oTransport);
      } else { // Base64
        srcFile = this._readBinaryFile(this.filelist[index].source);
        this._encodeBase64(srcFile, oTransport);
      }

      srcFile = "";

    } catch(e) {
      mafdebug(e);
    }
  },


  /**
   * Read the contents of a file as bytes
   */
  _readBinaryFile: function(sourcepath) {
    try {
      var obj_File = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
      obj_File.initWithPath(sourcepath);

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
      var str = obj_BinaryIO.readByteArray(obj_File.fileSize);

    } catch (e) {
      mafdebug(e);
    }
    obj_BinaryIO.close();
    obj_InputStream.close();

    return str;
  },

  /**
   * Determine the MIME encoding to used based on the content type
   */
  _getContentEncodingByType: function(fileContentType) {
    var result = "base64";
    if (fileContentType.trim().toLowerCase() == "text/html") { result = "quoted-printable"; }
    if (fileContentType.trim().toLowerCase() == "text/css") { result = "quoted-printable"; }
    if (fileContentType.trim().toLowerCase() == "application/x-javascript") { result = "quoted-printable"; }
    return result;
  },

  /**
   * Encode text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintable: function(sourcepath, oTransport) {

    try {
      var obj_File = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
      obj_File.initWithPath(sourcepath);

      var obj_InputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                               .createInstance(Components.interfaces.nsIFileInputStream);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_ScriptableIO = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                .createInstance(Components.interfaces.nsIScriptableInputStream);
      obj_ScriptableIO.init(obj_InputStream);
    } catch (e) {
      mafdebug(e);
    }

    var eqtState = new encodeQuotedPrintableTimerState();

    eqtState.totalFileSize = obj_File.fileSize;
    eqtState.charsToRead = this.READ_BUFFER_SIZE;
    eqtState.str = "";
    eqtState.obj_ScriptableIO = obj_ScriptableIO;
    eqtState.obj_InputStream = obj_InputStream;
    eqtState.obj_File = obj_File;
    eqtState.encoder = this;
    eqtState.oTransport = oTransport;

    var timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
    eqtState.timer = timer;
    timer.initWithCallback(eqtState, qpEncodeTimerDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },

  /**
   * Based on code from the FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _encodeBase64: function(decStr, oTransport) {
    var result = "";

    try {

      var bits, dual, i = 0, encOut = '';

      while(decStr.length >= i + 3) {
        bits = (decStr[i++] & 0xff) <<16 |
               (decStr[i++] & 0xff) <<8  |
                decStr[i++] & 0xff;
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  this.base64s.charAt((bits & 0x00000fc0) >> 6) +
                  this.base64s.charAt((bits & 0x0000003f));

        if (encOut.length > this.QPENCODE_MAXLINESIZE) {
          // Split into lines of QPENCODE_MAXLINESIZE characters or less
          result = encOut.slice(0, this.QPENCODE_MAXLINESIZE) + "\r\n";
          encOut = encOut.substring(this.QPENCODE_MAXLINESIZE, encOut.length);
          oTransport.write(result, result.length);
        }


      }
      if (decStr.length -i > 0 && decStr.length - i < 3) {
        dual = Boolean(decStr.length -i -1);
        bits = ((decStr[i++] & 0xff) <<16) |
                (dual ? (decStr[i] & 0xff) <<8 : 0);
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  (dual ? this.base64s.charAt((bits & 0x00000fc0) >>6) : '=') + '=';
      }
      result = encOut;
    } catch(e) {
      mafdebug(e);
    }

    if (encOut.length > this.QPENCODE_MAXLINESIZE) {
      // Split into lines of QPENCODE_MAXLINESIZE characters or less
      result = encOut.slice(0, this.QPENCODE_MAXLINESIZE);
      i = this.QPENCODE_MAXLINESIZE;
      while (i < encOut.length) {
        result += "\r\n" + encOut.slice(i, i + this.QPENCODE_MAXLINESIZE);
        i += this.QPENCODE_MAXLINESIZE;
      }
      oTransport.write(result, result.length);
    } else {
      oTransport.write(encOut, encOut.length);
    }

    result = "";
    encOut = "";

    var obs = Components.classes["@mozilla.org/observer-service;1"]
               .getService(Components.interfaces.nsIObserverService);
    obs.notifyObservers(null, "encoding-mht-encoder-finished", "base64");
  },

  /**
   * Encode a single line of text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableLine: function(srcLineString) {
    var result;
    result = "";

    if (srcLineString.length > 0) {
      var s = "";

      for (var i = 0; i<srcLineString.length-1; i++) {
        s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(i), this.QPENCODE_UNALTERED);
      }

      // Encode last character; if space, encode it
      s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(srcLineString.length-1),
                                                 this.QPENCODE_UNALTEREDEND);

      result = s;

      if (s.length > this.QPENCODE_MAXLINESIZE) {

        // Split into lines of QPENCODE_MAXLINESIZE characters or less
        result = s.slice(0, this.QPENCODE_MAXLINESIZE);
        i = this.QPENCODE_MAXLINESIZE;

        // If either the last character, character before is =
        //   then we've split across a code - Bad idea for compatibility with
        //   streaming decoders who may see == or =A= or such and upchuck.
        if (result.charAt(result.length-1) == "=") {
          result = result.slice(0, result.length - 1);
          i -= 1;
        } else if (result.charAt(result.length-2) == "=") {
          result = result.slice(0, result.length - 2);
          i -= 2;
        }

        while (i < s.length) {
          result += "=\r\n" + s.slice(i, i + this.QPENCODE_MAXLINESIZE);
          i += this.QPENCODE_MAXLINESIZE;

          if (result.charAt(result.length-1) == "=") {
            result = result.slice(0, result.length - 1);
            i -= 1;
          } else if (result.charAt(result.length-2) == "=") {
            result = result.slice(0, result.length - 2);
            i -= 2;
          }
        }
      }

      s = "";

    }

    return result;
  },


  /**
   * Encode a single line of text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  encodeQuotedPrintableString: function(srcLineString) {
    var result;
    result = "";

    if (srcLineString.length > 0) {
      var s = "";

      for (var i = 0; i<srcLineString.length-1; i++) {
        s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(i), this.QPENCODE_UNALTERED);
      }

      // Encode last character; if space, encode it
      s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(srcLineString.length-1),
                                                 this.QPENCODE_UNALTEREDEND);

      result = s;
    }

    return result;
  },

  /**
   * Encode a character that isn't in range as a hex string
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableCharacter: function(Character, UnAltered) {
    var x, Alter=true;
    for (var i=0; i<UnAltered.length; i+=2) {
      if ((Character >= UnAltered.charCodeAt(i)) && (Character <= UnAltered.charCodeAt(i+1))) {
        Alter=false;
      }
    }

    if (!Alter) {
      return String.fromCharCode(Character);
    }

    x = Character.toString(16).toUpperCase();
    return (x.length == 1) ? "=0" + x : "=" + x;
  },

  /**
   * Generates the boundary string used to seperate MIME parts
   */
  _getBoundaryString: function() {
    var result = "----=_NextPart_000_0000_";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    result += ".";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    return result;
  },

  /**
   * Convert a single decimal digit (0 to 15) into hex
   */
  _hex: function(decDigit) {
    if (decDigit >=0 && decDigit <= 15) {
      return("0123456789ABCDEF".charAt(decDigit));
    } else {
      return "0";
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtEncoderIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};

function encodingTimerState() {

};

encodingTimerState.prototype = {

  observe: function(subject, topic, data) {
    if (topic != "encoding-mht-encoder-finished")
      return;

    var obs = Components.classes["@mozilla.org/observer-service;1"]
                 .getService(Components.interfaces.nsIObserverService);
    obs.removeObserver(this, "encoding-mht-encoder-finished");

    if (this.boundaryString != "") {
      var MHTContentString = "\r\n";
      this.oTransport.write(MHTContentString, MHTContentString.length);
      MHTContentString = "";
    }

    this.i++;

    //mafdebug("Incremented i, it's now: " + this.i);

    var timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
    this.timer = timer;
    timer.initWithCallback(this, fileEncodeTimerDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {

      if (this.i < this.encoder.filelist.length) {
        var obs = Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService);
        obs.addObserver(this, "encoding-mht-encoder-finished", false);

        if (this.boundaryString == "") {

          this.encoder._getEncodedFile(this.i, this.oTransport);

        } else {
          var MHTContentString = "\r\n\--" + this.boundaryString + "\r\n";
          this.oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

          this.encoder._getEncodedFile(this.i, this.oTransport);
        }

        //mafdebug("Called getEncodedFile " + this.i);

      } else { // Finished

        //mafdebug("Finished encoding!");

        if (this.boundaryString != "") {
          // End file content
          var MHTContentString = "\r\n--" + this.boundaryString + "--\r\n";
          this.oTransport.write(MHTContentString, MHTContentString.length);
        }

        this.oTransport.close();

        this.encoder.filelist.clear();
        this.timer = null;

        var observerData = new Array();
        observerData[observerData.length] = 0;
        observerData[observerData.length] = this.dest.path;

        var obs = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "mht-encoder-finished", observerData);

      }
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsIObserver) &&
        !iid.equals(Components.interfaces.nsITimerCallback) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};


function encodeQuotedPrintableTimerState() {
  this.totalFileSize = 0;
  this.charsToRead = 0;
  this.str = "";
}

encodeQuotedPrintableTimerState.prototype = {

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {
      if (this.totalFileSize > 0) {

      //mafdebug("QP: TotalFileSize: " + this.totalFileSize);

      var CRLF = "\r\n";
      var LF = "\n";

        var CRLFIndex = this.str.indexOf(CRLF);
        var LFIndex = this.str.indexOf(LF);


        if ((CRLFIndex == -1) && (LFIndex == -1)) {
          while ((this.str.indexOf(CRLF) == -1) && (this.str.indexOf(LF) == -1) && (this.totalFileSize > 0)) {
            if (this.charsToRead > this.totalFileSize) {
              this.charsToRead = this.totalFileSize;
            }
            this.str += this.obj_ScriptableIO.read(this.charsToRead);
            this.totalFileSize -= this.charsToRead;
          }
        }


        do {

        CRLFIndex = this.str.indexOf(CRLF);
        LFIndex = this.str.indexOf(LF);

        var index = this.str.length;
        var indexOffset = 1;

          if ((CRLFIndex == -1) && (LFIndex != -1)) {
            index = LFIndex;
            indexOffset = 1;
          } else {
            if ((CRLFIndex != -1) && (LFIndex == -1)) {
              index = CRLFIndex;
              indexOffset = 2;
            } else {
              if ((CRLFIndex != -1) && (LFIndex != -1)) {
                index = Math.min(CRLFIndex, LFIndex);
                if (index == CRLFIndex) {
                  indexOffset = 2;
                } else {
                  indexOffset = 1;
                }
              }
            }
          }

          var textLine = this.str.substring(0, index);
          this.str = this.str.substring(index + indexOffset, this.str.length);

          var result = this.encoder._encodeQuotedPrintableLine(textLine) + CRLF;
          this.oTransport.write(result, result.length);

          result = "";

        } while ((CRLFIndex != -1) || (LFIndex != -1 ));

        //mafdebug("No more CRLFs or LFs. Starting callback for QP Encode.");

        //mafdebug("QP: TotalFileSize: " + this.totalFileSize);

        // Timer
        var timer = Components.classes["@mozilla.org/timer;1"]
                      .createInstance(Components.interfaces.nsITimer);
        this.timer = timer;
        timer.initWithCallback(this, qpEncodeTimerDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    } else {

      //mafdebug("Done QP Encoding");

      //mafdebug("QP: TotalFileSize: " + this.totalFileSize);

      try {
      // Done encoding
      this.obj_ScriptableIO.close();
      this.obj_InputStream.close();

      this.obj_File = null;
      this.obj_ScriptableIO = null;
      this.obj_InputStream = null;
      } catch(e) { }

      var obs = Components.classes["@mozilla.org/observer-service;1"]
                 .getService(Components.interfaces.nsIObserverService);
      obs.notifyObservers(null, "encoding-mht-encoder-finished", "quoted-printable");
      this.timer = null;
    }

    }

  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsITimerCallback) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
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


Array.prototype.clear = function() {
  while (this.length > 0) {
    this.pop();
  }
};

var MAFMhtEncoderFactory = new Object();

MAFMhtEncoderFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafMhtEncoderIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }
  
  return (new MafMhtEncoderClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFMhtEncoderModule = new Object();

MAFMhtEncoderModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafMhtEncoderCID,
                                  "Maf MHT Encoder JS Component",
                                  mafMhtEncoderContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFMhtEncoderModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafMhtEncoderCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFMhtEncoderFactory;
};

MAFMhtEncoderModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFMhtEncoderModule;
};

