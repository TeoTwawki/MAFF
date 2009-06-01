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

      if (dest.exists()) {
        dest.remove(false);
      }

      dest.create(0x00, 0644);

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

    var self = this;
    var threadManager = Cc["@mozilla.org/thread-manager;1"].
     getService(Ci.nsIThreadManager);
    threadManager.mainThread.dispatch({
      run: function() { self.notify(); }
    }, Ci.nsIThread.DISPATCH_NORMAL);
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
    var str = "";
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

      str = obj_ScriptableIO.read(obj_File.fileSize);

      obj_ScriptableIO.close();
      obj_InputStream.close();
    } catch (e) {
      mafdebug(e);
    }

    var result = MimeSupport.encodeQuotedPrintable(str);

    oTransport.write(result, result.length);

    this.onEncodingFinished();
  },

  /**
   * Encode to base 64 using the hidden window's btoa function
   *
   */
  _encodeBase64: function(decStr, oTransport) {
    var result = MimeSupport.encodeBase64(decStr);
    oTransport.write(result, result.length);
    this.onEncodingFinished();
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

    var self = this;
    var threadManager = Cc["@mozilla.org/thread-manager;1"].
     getService(Ci.nsIThreadManager);
    threadManager.mainThread.dispatch({
      run: function() { self.notify(); }
    }, Ci.nsIThread.DISPATCH_NORMAL);
  },

  notify: function() {
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
        this.mafeventlistener.onArchivingComplete(0);
      }
  }

};