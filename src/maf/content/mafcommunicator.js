/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.2
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

/**
 * Included from Firefox to work in Mozilla.
 */

function isDocumentType(aContentType)
{
  switch (aContentType) {
  case "text/html":
    return true;
  case "text/xml":
  case "application/xhtml+xml":
  case "application/xml":
    return false; // XXX Disables Save As Complete until it works for XML
  }
  return false;
}

try {

if (kSaveAsType_Complete != 0) {
  const kSaveAsType_Complete = 0;   // Save document with attached objects
}

if (kSaveAsType_URL != 1) {
  const kSaveAsType_URL = 1;        // Save document or URL by itself
}

if (kSaveAsType_Text != 2) {
  const kSaveAsType_Text = 2;       // Save document, converting to plain text.
}

if (MODE_COMPLETE != 0) {
  const MODE_COMPLETE = 0;
}

if (MODE_FILEONLY != 1) {
  const MODE_FILEONLY = 1;
}

} catch (e) {

}

function getTargetFile(aData, aSniffer, aContentType, aIsDocument, aSkipPrompt, aSaveAsTypeResult)
{
  aSaveAsTypeResult.rv = kSaveAsType_Complete;

  // Determine what the 'default' string to display in the File Picker dialog
  // should be.
  var defaultFileName = getDefaultFileName(aData.fileName,
                                           aSniffer.suggestedFileName,
                                           aSniffer.uri,
                                           aData.document);

  var defaultExtension = getDefaultExtension(defaultFileName, aSniffer.uri, aContentType);
  var defaultString = getNormalizedLeafName(defaultFileName, defaultExtension);

  const prefSvcContractID = "@mozilla.org/preferences-service;1";
  const prefSvcIID = Components.interfaces.nsIPrefService;
  var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("browser.download.");

  const nsILocalFile = Components.interfaces.nsILocalFile;

  // ben 07/31/2003:
  // |browser.download.defaultFolder| holds the default download folder for
  // all files when the user has elected to have all files automatically
  // download to a folder. The values of |defaultFolder| can be either their
  // desktop, their downloads folder (My Documents\My Downloads) or some other
  // location of their choosing (which is mapped to |browser.download.dir|
  // This pref is _unset_ when the user has elected to be asked about where
  // to place every download - this will force the prompt to ask the user
  // where to put saved files.
  var dir = null;
  try {
    dir = prefs.getComplexValue("defaultFolder", nsILocalFile);
  }
  catch (e) { }

  var file;
  if (!aSkipPrompt || !dir) {
    // If we're asking the user where to save the file, root the Save As...
    // dialog on they place they last picked.
    try {
      dir = prefs.getComplexValue("lastDir", nsILocalFile);
    }
    catch (e) {
      // No default download location. Default to desktop.
      var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);

      function getDesktopKey()
      {
        return "Home";
      }

      dir = fileLocator.get(getDesktopKey(), Components.interfaces.nsILocalFile);
    }


    var fp = makeFilePicker();
    var titleKey = aData.filePickerTitle || "SaveLinkTitle";
    var bundle = getStringBundle();
    fp.init(window, bundle.GetStringFromName(titleKey),
            Components.interfaces.nsIFilePicker.modeSave);

    var urlExt = null;
    try {
      var url = aSniffer.uri.QueryInterface(Components.interfaces.nsIURL);
      urlExt = url.fileExtension;
    }
    catch (e) {
    }
    appendFiltersForContentType(fp, aContentType, urlExt,
                                aIsDocument ? MODE_COMPLETE : MODE_FILEONLY);

    if (dir)
      fp.displayDirectory = dir;

    if (aIsDocument) {
      try {
        fp.filterIndex = prefs.getIntPref("save_converter_index");
      }
      catch (e) {
      }
    }

    fp.defaultExtension = defaultExtension;
    fp.defaultString = defaultString;

    if (fp.show() == Components.interfaces.nsIFilePicker.returnCancel || !fp.file)
      return null;

    var useDownloadDir = false;
    try {
      useDownloadDir = prefs.getBoolPref("useDownloadDir");
    }
    catch(ex) {
    }

    var directory = fp.file.parent.QueryInterface(nsILocalFile);
    prefs.setComplexValue("lastDir", nsILocalFile, directory);

    fp.file.leafName = validateFileName(fp.file.leafName);
    aSaveAsTypeResult.rv = fp.filterIndex;
    file = fp.file;

    if (aIsDocument)
      prefs.setIntPref("save_converter_index", aSaveAsTypeResult.rv);
  }
  else {
    // ben 07/31/2003:
    // We don't nullcheck dir here because dir should never be null if we get here
    // unless something is badly wrong, and if it is, I want to know about it in
    // bugs.
    dir.append(defaultString);
    file = dir;

    // Since we're automatically downloading, we don't get the file picker's
    // logic to check for existing files, so we need to do that here.
    //
    // Note - this code is identical to that in
    //   browser/components/downloads/content/nsHelperAppDlg.js.
    // If you are updating this code, update that code too! We can't share code
    // here since that code is called in a js component.
    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)|((\d+)$)/,
                                              function (str, dot, dotNum, noDot, noDotNum, pos, s) {
                                                return (parseInt(str) + 1) + (dot ? "." : "");
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\.|$/, "-1$&");
      }
    }

  }

  return file;
}
/**
 * End include for Mozilla
 */

