#!/bin/sh
rm -frd src/components/CVS
rm -f src/components/maf.0.4.1.xpt
rm -f src/components/maf.0.4.3.xpt
rm -frd src/maf/CVS
rm -frd src/maf/content/CVS
rm -frd src/maf/locale/CVS
rm -frd src/maf/locale/en-US/CVS
rm -frd src/maf/locale/fr-FR/CVS
rm -frd src/maf/locale/it-IT/CVS
rm -frd src/maf/locale/pl-PL/CVS
rm -frd src/maf/locale/ru-RU/CVS
rm -frd src/scripts/CVS

mkdir build
cd build
rm -f maf-0.5.0.xpi
mkdir common
cd common
mkdir chrome
cd ../../src/maf
rm -f ../../build/common/chrome/maf.jar
zip -r ../../build/common/chrome/maf.jar .
cd ../../build/common
zip -r ../maf-0.5.0.xpi .
cd ../../src
zip -r ../build/maf-0.5.0.xpi install.* maf.html components scripts
cd ..
