initInstall("Mozilla Archive Format","/Christopher Ottley/Mozilla Archive Format","0.5.0");

var jarFile = "maf.jar";

var mafDir = getFolder("Profile", "chrome");

// If there isn't a previous installation go ahead
var previousFile = getFolder(mafDir, jarFile); // Previous jar
if (!File.exists(previousFile)) {

setPackageFolder(mafDir);

addFile("Adding MAF", "chrome/" + jarFile, getFolder("Profile", "chrome"), "");

var jarPath = getFolder(mafDir, jarFile);

registerChrome(CONTENT | PROFILE_CHROME, jarPath, "content/");
//registerChrome(   SKIN | PROFILE_CHROME, jarPath, "skin/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/en-US/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/it-IT/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/fr-FR/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/ru-RU/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/pl-PL/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/pt-BR/"); 

var componentsDir = getFolder("Components");  //getFolder("Profile", "components");
setPackageFolder(componentsDir);

// add the components and typelib
addFile("components/maf.0.5.0.xpt");
addFile("components/nsMafArchivePostProcessor.js");
addFile("components/nsMafArchiver.js");
addFile("components/nsMafBlockingObserverService.js");
addFile("components/nsMafDocumentViewerFactory.js");
addFile("components/nsMafGuiHandler.js");
addFile("components/nsMafMhtDecoder.js");
addFile("components/nsMafMhtEncoder.js");
addFile("components/nsMafMhtHandler.js");
addFile("components/nsMafPreferences.js");
addFile("components/nsMafPreferencesRec.js");
addFile("components/nsMafProtocol.js");
addFile("components/nsMafState.js");
addFile("components/nsMafStringValue.js");
addFile("components/nsMafTabArchiver.js");
addFile("components/nsMafTabExpander.js");
addFile("components/nsMafUtil.js");

var tempDir = getFolder("Preferences");

var mafScriptFolder = getFolder(tempDir,"maf");
File.dirCreate(mafScriptFolder);

var mafTempFolder = getFolder(mafScriptFolder, "maftemp");
File.dirCreate(mafTempFolder);

setPackageFolder(mafScriptFolder);
addFile("scripts/mafzip.sh");
addFile("scripts/mafunzip.sh");
addFile("scripts/mafzip.bat");
addFile("scripts/mafunzip.bat");
addFile("scripts/invis.vbs");
addFile("scripts/unzip.exe");
addFile("scripts/zip.exe");
addFile("scripts/zip.license.txt");
addFile("scripts/setmafffiletype.vbs");
addFile("scripts/setmaffiletype.vbs");
addFile("scripts/setmhtfiletype.vbs");
addFile("scripts/unsetallfiletypes.vbs");

var err = performInstall();
if (err == SUCCESS || err == 999) {
  alert("MAF 0.5.0 is now installed.\nPlease restart your browser to activate it.");
} else {
  alert("Install failed. Error code:" + err + "\nTry installing it again");
}

} else {
  alert("There is a version of MAF already installed.\nPlease remove it before installing this version.");
  cancelInstall();
}
