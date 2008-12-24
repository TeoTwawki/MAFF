--------------------------------------------------------------------------------
 Mozilla Archive Format - Vendor branches
--------------------------------------------------------------------------------

Vendor folder layout
--------------------

This folder contains the original source material for other projects that are
integrated in Mozilla Archive Format. The files included here are mostly
preserved as they appear in their original version.

Every first-level subfolder maps to a different project:

  * "mozilla" subfolder

    Contains portions of the Mozilla user-interface code that is "overlaid" by
    Mozilla Archive Format. The modified sources can be found in the
    "integration" folder of the main MAF source code. The source code found
    there redefines only a portion of the original functions.

    The original Mozilla files copied here are:
      /browser/base/content/browser.js
      /toolkit/content/contentAreaUtils.js

    A subfolder exists for every distinct version of the file, as found in some
    of the released product versions. These subfolders are:
      "fx-3_0"   - CVS tag: FIREFOX_3_0_RELEASE
      "fx-3_0_5" - CVS tag: FIREFOX_3_0_5_RELEASE
      "fx-3_1b2" - Mercurial tag: FIREFOX_3_1b2_RELEASE

    The subfolder named "current" contains the latest version used as a
    reference for the files in the "integration" folder. As files in this
    folder are updated, the differences are propagated to the files in the
    main source tree, for all the functions that are redefined there.

  * "babelzilla" subfolder

    Contains the chrome locale folders as downloaded from the BabelZilla Web
    Translation System, using the "Download locales (missing strings: skipped)"
    function.

    These localized files do not include the strings that are still untranslated
    on BabelZilla, thus cannot be included in the release version as they are.
    These files are instead required to build the next version to be feeded to
    the WTS, combined with the new en-US locale.



Retrieving the original Mozilla files
-------------------------------------

The original Mozilla source files found in the vendor folders map to specific
CVS and Mercurial repository tags. As of 2008-12-22, the original files from
the CVS repository can be browsed from Mozilla Cross-Reference at the address:

  <http://mxr.mozilla.org/mozilla/>

Files from the Mercurial repository can be viewed using an URL of the form:

  <http://hg.mozilla.org/releases/mozilla-1.9.1/file/FIREFOX_3_1b2_RELEASE/toolkit/content/contentAreaUtils.js>



--------------------------------------------------------------------------------
 END OF DOCUMENT
--------------------------------------------------------------------------------
