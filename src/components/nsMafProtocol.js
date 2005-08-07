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

// Provides a maf: protocol handler

const mafProtocolScheme = "maf";
const mafProtocolName = "Mozilla Archive Format Access Protocol";
const mafProtocolContractID = "@mozilla.org/network/protocol;1?name=" + mafProtocolScheme;
const mafProtocolCID = Components.ID("0cd60c15-b7a9-4190-9176-81ecd67e8174");

var MafState = null;
var MafUtils = null;
var MafPreferences = null;
var MafLibMHTDecoder = null;
var MafMHTHandler = null;
var MafBlockingObserver = null;

var MafStrBundle = null;

function MAFProtocol() { }

MAFProtocol.prototype = {
  QueryInterface: function(iid)   {
    if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
        !iid.equals(Components.interfaces.nsIMaf) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  scheme: mafProtocolScheme,
  defaultPort: -1,
  protocolFlags: Components.interfaces.nsIProtocolHandler.URI_NORELATIVE |
                 Components.interfaces.nsIProtocolHandler.URI_NOAUTH,

  allowPort: function(port, scheme) {
    return false;
  },

  newURI: function(spec, charset, baseURI) {
    var uri = Components.classes["@mozilla.org/network/simple-uri;1"]
                .createInstance(Components.interfaces.nsIURI);
    uri.spec = spec;
    return uri;
  },

  isMhtArchive: function(uri) {
    var result = false;

    var loadURIMafRegExp = new RegExp(MafPreferences.getOpenFilterRegEx(), "i");

     if (uri.match(loadURIMafRegExp)) {

         var loadURIios = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

         // Get leaf name
         try {
           var ouri = loadURIios.newURI(uri, "", null);    // Create URI object
           var file = ouri.QueryInterface(Components.interfaces.nsIFileURL).file;
         } catch(e) {
           // It wasn't a URL of the form file://, let's try again, shall we?
           try {
             var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
             file.initWithPath(uri);
           } catch(ex) {
             // Give up
             mafdebug(MafStrBundle.GetStringFromName("mafprotocolloadhasgivenup") + ex);
           }
         }

          var ismaf = false;

          try {
            // If file extension match any of the filters MAF handles
            var filterIndex = MafPreferences.getOpenFilterIndexFromFilename(file.leafName);

            // Get matching filter
            ismaf = (filterIndex != -1);
          } catch(e) {
            mafdebug(e);
          }

          if (ismaf) {
            // Get original url's to local file path
            var localFilePath = file.path;

            result = (MafLibMHTDecoder.PROGID == MafPreferences.programFromOpenIndex(filterIndex));
          }
     }
    return result;
  },

  openArchiveURI: function(uri) {
    var resultURI = uri;
     
    var loadURIMafRegExp = new RegExp(MafPreferences.getOpenFilterRegEx(), "i");

     if (uri.match(loadURIMafRegExp)) {

         var loadURIios = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

         // Get leaf name
         try {
           var ouri = loadURIios.newURI(uri, "", null);    // Create URI object
           var file = ouri.QueryInterface(Components.interfaces.nsIFileURL).file;
         } catch(e) {
           // It wasn't a URL of the form file://, let's try again, shall we?
           
           try {
             var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
             file.initWithPath(uri);
           } catch(ex) {
             
             // Give up
             mafdebug(MafStrBundle.GetStringFromName("mafprotocolloadhasgivenup") + ex);
           }
         }

          var ismaf = false;

          try {
            // If file extension match any of the filters MAF handles
            var filterIndex = MafPreferences.getOpenFilterIndexFromFilename(file.leafName);

            // Get matching filter
            ismaf = (filterIndex != -1);
          } catch(e) {
            mafdebug(e);
          }

          if (ismaf) {
            // Get original url's to local file path
            var localFilePath = file.path;

            try {
              // Open as a MAF with registered filter
              resultURI = this.openFromArchive(MafPreferences.temp,
                                MafPreferences.programFromOpenIndex(filterIndex), localFilePath);                             
            } catch(e) {
              mafdebug(e);
            }
          }
     }
     
     return resultURI;
  },


  openFromArchive: function(tempPath, scriptPath, archivePath) {
    var resultURI = "";
    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random()*1000);

    var objMafTabExpander = Components.classes["@mozilla.org/libmaf/tabexpander;1"]
                                 .createInstance(Components.interfaces.nsIMafTabExpander);

    objMafTabExpander.init(tempPath, scriptPath, archivePath, folderNumber, this);
    objMafTabExpander.startBlocking();

    var count = {};
    var archiveLocalURLs = {};

    MafBlockingObserver.notifyObservers(null, "maf-open-archive-complete", MafUtils.appendToDir(tempPath, folderNumber));
    MafState.addArchiveInfo(tempPath, folderNumber, archivePath, count, archiveLocalURLs);
    
    resultURI = MafUtils.getURIFromFilename(archivePath);
    return resultURI;
  },

  /**
   * Extract the archive using the specified program
   */
  extractFromArchive: function(program, archivefile, destpath) {
    if (program == MafLibMHTDecoder.PROGID) {

      var dateTimeExpanded = new Date();
      var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random() * 1000);

      var realDestPath = MafUtils.appendToDir(destpath, folderNumber);

      MafMHTHandler.extractArchive(archivefile, realDestPath);
    } else {
      var oArchivefile = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
      oArchivefile.initWithPath(archivefile);

      var oDestpath = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
      oDestpath.initWithPath(destpath);
          
      if (!oDestpath.exists() || !oDestpath.isDirectory()) {
        oDestpath.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
      }
      
      var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                        .createInstance(Components.interfaces.nsIZipReader);
      zipReader.init(oArchivefile);
      zipReader.open();

      var it = zipReader.findEntries("*");
      while (it.hasMoreElements()) {
        var entry = it.getNext();
        entry = entry.QueryInterface(Components.interfaces.nsIZipEntry);	

        var oDestpathentry = Components.classes["@mozilla.org/file/local;1"]
                          .createInstance(Components.interfaces.nsILocalFile);
        oDestpathentry.initWithPath(destpath);
        oDestpathentry.setRelativeDescriptor(oDestpath, entry.name);
        
        if (entry.name.endsWith("/")) {
          // Folder
          //alert("Extracting " + entry.name);
          if (!oDestpathentry.exists() || !oDestpathentry.isDirectory()) {
            oDestpathentry.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
          }          
        } else {
          //alert("Extracting " + entry.name);
          if (!oDestpathentry.parent.exists() || !oDestpathentry.parent.isDirectory()) {
            oDestpathentry.parent.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
          }
          zipReader.extract(entry.name, oDestpathentry);        
        }
      }
      zipReader.close();     
       
      var obs = Components.classes["@mozilla.org/observer-service;1"]
                   .getService(Components.interfaces.nsIObserverService);      
                   
      var observerData = new Array();
      observerData[observerData.length] = 0; // Error code
      observerData[observerData.length] = destpath;

      obs.notifyObservers(null, "maf-extract-finished", observerData); 
    }
  },

  /**
   * Convert unicode arguments to native charset
   * Contributed by: glassprogrammer
   * Bug ref#: 7995
   */
  _arguments2Native: function (args){
    try {
    //Check current locale
      var oLocaleSrv = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
                         .createInstance(Components.interfaces.nsILocaleService);
      var sLocale = oLocaleSrv.getLocaleComponentForUserAgent();

      //Get the correct charset
      var sCharset = null;
      switch (sLocale) {
        case "cs-CZ":
        case "hr-HR":
        case "hu-HU":
        case "lt-LT":
        case "lv-LV":
        case "pl-PL":
        case "ro-RO":
        case "sk-SK":
        case "sl-SI":
        case "sq-AL":
                      sCharset = "ISO-8859-2";
                      break;

        case "be-BY":
        case "bg-BG":
        case "mk-MK":
        case "ru-RU":
        case "sh-YU":
        case "sr-YU":
        case "uk-UA":
                      sCharset = "ISO-8859-5";
                      break;

        case "ar-SA":
                      sCharset = "ISO-8859-6";
                      break;


        case "el-GR":
                      sCharset = "ISO-8859-7";
                      break;

        case "iw-IL":
                      sCharset = "ISO-8859-8";
                      break;

        case "tr-TR":
                      sCharset = "ISO-8859-9";
                      break;

        case "ja-JP":
                      sCharset = "Shift_JIS";
                      break;
        case "ko-KR":
                      sCharset = "EUC-KR";
                      break;
        case "zh-CN":
                      sCharset = "GBK";
                      break;
        case "zh-TW":
                      sCharset = "BIG5";
                      break;

        default: sCharset = null; // "ISO-8859-1"
                  break;
      }

      //Convert
      if (sCharset != null) {
        var oConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                           .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

        oConverter.charset = sCharset;
        for(var i = 0; i < args.length; i++) {
          args[i] = oConverter.ConvertFromUnicode(args[i]);
        }
      }
    } catch (e) {
      mafdebug(MafStrBundle.GetStringFromName("errorconvertingunicodetonative") + e);
    }
  },

  newChannel: function(aURI) {
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                 .getService(Components.interfaces.nsIIOService);

    if (MafPreferences.enableMafProtocol) {
      var strURI = aURI.spec;

      // strip off the maf:// part
      var requestURI;

      if (strURI.toLowerCase().startsWith("maf://")) {
        requestURI = strURI.substring(6, strURI.length);
      } else {
        if (strURI.toLowerCase().startsWith("maf:")) {
          requestURI = strURI.substring(4, strURI.length);
        } else {
          // Er, not a maf protocol. Why are we being invoked?
          requestURI = "about:blank";
        }
      }

      // If there's no :// then put it in
      if (requestURI.indexOf("://") == -1) {
        if (requestURI.indexOf("//") == -1) {
          requestURI = "about:blank";
        } else {
          requestURI = requestURI.substring(0, requestURI.indexOf("//")) + ":" +
                       requestURI.substring(requestURI.indexOf("//"), requestURI.length);
        }
      }


      if (!requestURI.toLowerCase().startsWith("file://")) {
        // A network URI? If so download the file to temp and use that file
        var oTempFile = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
        oTempFile.initWithPath(MafPreferences.temp);

        var oTempFileName = (new Date()).valueOf() + "_" + Math.floor(Math.random() * 1000);
        oTempFileName += this.getFileExtFromURI(requestURI);
        oTempFile.append(oTempFileName);

        var netRequest = requestURI;

        if (netRequest.indexOf("!") > -1) {
          netRequest = netRequest.substring(0, netRequest.indexOf("!"));
        }

        this.saveURIToFile(netRequest, oTempFile);

        var subPart = "";
        if (requestURI.indexOf("!") > 0) {
          subPart = requestURI.substring(requestURI.indexOf("!"), requestURI.length);
        }

        requestURI = MafUtils.getURI(oTempFile);

        requestURI += subPart;

      }

      if (requestURI.indexOf("!") > -1) {
        try {
          var filePart = requestURI.substring(requestURI.indexOf("!") + 1, requestURI.length);
          var fileParts = filePart.split("/");

          // strip off the ! part
          var requestURI = requestURI.substring(0, requestURI.indexOf("!"));

          if (!MafState.isArchiveURIOpen(requestURI)) {
            // Open it!
            requestURI = this.openArchiveURI(requestURI);
          }

          if (MafState.isArchiveURIOpen(requestURI)) {
            
            var destPath = "";

            if (this.isMhtArchive(requestURI)) {
              destPath = MafState.expandedArchiveURIPath(requestURI);

              var oDir = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsILocalFile);
              oDir.initWithPath(destPath);

              if (oDir.exists() && oDir.isDirectory()) {
                var entries = oDir.directoryEntries;

                // If the entry for the MHT archive exists
                if (entries.hasMoreElements()) {
                  var currDir = entries.getNext();
                  currDir.QueryInterface(Components.interfaces.nsILocalFile);
                  destPath = currDir.path;
                }
              }

            } else {
              destPath = MafState.expandedArchiveURIPath(requestURI);
            }

            for (var i=0; i<fileParts.length; i++) {
              destPath = MafUtils.appendToDir(destPath, fileParts[i]);
            }
            requestURI = MafUtils.getURIFromFilename(destPath);
          }
        } catch(e) {
          requestURI = "about:blank";
        }

        return ios.newChannel(requestURI, null, null);
      } else {
        return ios.newChannel("about:blank", null, null);
      }
    } else {
      return ios.newChannel("about:blank", null, null);
    }
  },

  /**
   * Read the contents of a uri and write the result to a file in a blocking manner
   */
  saveURIToFile: function(str_URI, obj_LocalFile) {
    try {
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(str_URI, null, null);
      var channel = ioService.newChannelFromURI(uri);

      var obj_InputStream = channel.open();

      var obj_BinaryIO = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);

      obj_BinaryIO.setInputStream(obj_InputStream);

      if (!obj_LocalFile.exists()) {
        obj_LocalFile.create(0x00, 0644);
      }

      var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                          .createInstance(Components.interfaces.nsIFileOutputStream);
      oTransport.init( obj_LocalFile, 0x04 | 0x08 | 0x10, 064, 0 );

      var obj_BinaryO = Components.classes["@mozilla.org/binaryoutputstream;1"]
                           .createInstance(Components.interfaces.nsIBinaryOutputStream);
      obj_BinaryO.setOutputStream(oTransport);


    } catch (e) {
      mafdebug(e);
    }

    try {
      while (obj_InputStream.available() > 0) {
        var str = obj_BinaryIO.readByteArray(obj_InputStream.available());
        obj_BinaryO.writeByteArray(str, str.length);
      }
    } catch (e) {

    }

    try {
      obj_BinaryIO.close();
      obj_InputStream.close();
      oTransport.close();
    } catch (e) {

    }
  },

  /**
   * Todo: Implement. Get the extension to use. By default it assumes that it's a .maff uri
   */
  getFileExtFromURI: function(str_URI) {
    var result = ".maff";

    try {
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(str_URI, null, null);
      var path = uri.path;
    } catch (e) {

    }

    return result;
  }

}

function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
};

String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x=this;
  x=x.replace(/^\s*(.*)/, "$1");
  x=x.replace(/(.*?)\s*$/, "$1");
  return x;
};

String.prototype.startsWith = function(needle) {
  return (this.substring(0, needle.length) == needle);
};

String.prototype.endsWith = function(needle) {
  return (this.substring(this.length - needle.length, this.length) == needle);
};

var MAFProtocolFactory = new Object();

MAFProtocolFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
      !iid.equals(Components.interfaces.nsIMaf) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafState == null) {
    MafState = Components.classes["@mozilla.org/maf/state_service;1"]
                  .getService(Components.interfaces.nsIMafState);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafLibMHTDecoder == null) {
    MafLibMHTDecoder = Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtDecoder);
  }

  if (MafMHTHandler == null) {
    MafMHTHandler = Components.classes["@mozilla.org/maf/mhthandler_service;1"]
                       .getService(Components.interfaces.nsIMafMhtHandler);
  }

  if (MafBlockingObserver == null) {
    MafBlockingObserver = Components.classes["@mozilla.org/blocking-observer-service;1"]
                             .getService(Components.interfaces.nsIObserverService);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }
  
  return new MAFProtocol();
}


/**
 * XPCOM component registration
 */
var MAFProtocolModule = new Object();

MAFProtocolModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafProtocolCID,
                                  mafProtocolName,
                                  mafProtocolContractID,
                                  fileSpec,
                                  location,
                                  type);
}

MAFProtocolModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafProtocolCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFProtocolFactory;
}

MAFProtocolModule.canUnload = function (compMgr) {
  return true;
}

function NSGetModule(compMgr, fileSpec) {
  return MAFProtocolModule;
}
