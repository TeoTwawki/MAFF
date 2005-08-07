initInstall("Mozilla Archive Format","/Christopher Ottley/Mozilla Archive Format","0.6.3");

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
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/da-DK/");
registerChrome( LOCALE | PROFILE_CHROME, jarPath, "locale/de-DE/");

var componentsDir = getFolder("Components");  //getFolder("Profile", "components");
setPackageFolder(componentsDir);

// add the components and typelib
addFile("components/maf.0.6.3.xpt");
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

// Add the ZipWriter component
addFile("components/IZipWriterComponent.xpt");
addFile("components/ZipWriterComponent.dll");

// Add MSVC runtime for older Windows machines that need the library
var progFolder = getFolder("Program");
setPackageFolder(progFolder);
addFile("libs/msvcr71.dll");

var tempDir = getFolder("Preferences");

var mafScriptFolder = getFolder(tempDir,"maf");
File.dirCreate(mafScriptFolder);

var mafTempFolder = getFolder(mafScriptFolder, "maftemp");
File.dirCreate(mafTempFolder);

setPackageFolder(mafScriptFolder);
addFile("scripts/setmafffiletype.vbs");
addFile("scripts/setmhtfiletype.vbs");
addFile("scripts/unsetallfiletypes.vbs");

var err = performInstall();
if (err == SUCCESS || err == 999) {
  alert("MAF 0.6.3 is now installed.\nPlease restart your browser to activate it.");
} else {
  alert("Install failed. Error code:" + err + "\nTry installing it again");
}

} else {
  alert("There is a version of MAF already installed.\nPlease remove it before installing this version.");
  cancelInstall();
}
