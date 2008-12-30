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

// Provides MAF Mht Encoder Object

const qpEncodeTimerDelay = 10;
const fileEncodeTimerDelay = 100;
const readBufferSize = 1024 * 10; // 10K Read buffer

/**
 * The MAF Mht Encoder.
 */

function MafMhtEncoderClass(mafeventlistener) {
  this.filelist = new Array();
  this.mafeventlistener = mafeventlistener;
  // Determine the version information saved in MAF MHT archives
  var extUpdateInfo = Cc["@mozilla.org/extensions/manager;1"]
   .getService(Ci.nsIExtensionManager)
   .getItemForID("{7f57cf46-4467-4c2d-adfa-0cba7c507e54}");
  this.xMafHeaderValue = "Produced By MAF V" + extUpdateInfo.version;
}

MafMhtEncoderClass.prototype = {

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

      this.i = 0;
      this.boundaryString = "";

      try {
        var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                            .createInstance(Components.interfaces.nsIFileOutputStream);
        oTransport.init( dest, 0x04 | 0x08 | 0x10, 064, 0 );
        this.oTransport =  oTransport;

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
          MHTContentString += "X-MAF: " + this.xMafHeaderValue + "\r\n";
          MHTContentString += "\r\nThis is a multi-part message in MIME format.\r\n";

          oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

          this.boundaryString = boundaryString;

        } else {
          MHTContentString += "X-MAF: " + this.xMafHeaderValue + "\r\n";
          oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

        }


      } catch (e) {
        mafdebug(e);
      }
    }


    var timer = Components.classes["@mozilla.org/timer;1"]
                 .createInstance(Components.interfaces.nsITimer);
    this.timer = timer;
    timer.initWithCallback(this, fileEncodeTimerDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

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
      var str = obj_BinaryIO.readBytes(obj_File.fileSize);
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
    if (Maf_String_trim(fileContentType).toLowerCase() == "text/html") { result = "quoted-printable"; }
    if (Maf_String_trim(fileContentType).toLowerCase() == "text/css") { result = "quoted-printable"; }
    if (Maf_String_trim(fileContentType).toLowerCase() == "application/x-javascript") { result = "quoted-printable"; }
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

    var eqtState = new encodeQuotedPrintableTimerState(this);

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
   * Encode to base 64 using the hidden window's btoa function
   *
   */
  _encodeBase64: function(decStr, oTransport) {
    var result = "";

    try {

      var encOut = '';

      // Get hidden window
      var appShell = Components.classes["@mozilla.org/appshell/appShellService;1"]
                        .getService(Components.interfaces.nsIAppShellService);
      var hiddenWnd = appShell.hiddenDOMWindow;

      encOut = hiddenWnd.btoa(decStr);

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

    this.onEncodingFinished();
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

  onEncodingFinished: function() {
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

      if (this.i < this.filelist.length) {
        if (this.boundaryString == "") {

          this._getEncodedFile(this.i, this.oTransport);

        } else {
          var MHTContentString = "\r\n\--" + this.boundaryString + "\r\n";
          this.oTransport.write(MHTContentString, MHTContentString.length);
          MHTContentString = "";

          this._getEncodedFile(this.i, this.oTransport);
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

        this.filelist = [];
        this.timer = null;
        this.mafeventlistener.onArchivingComplete(0);
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


function encodeQuotedPrintableTimerState(encodingeventlistener) {
  this.encodingeventlistener = encodingeventlistener;
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

      this.encodingeventlistener.onEncodingFinished();
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