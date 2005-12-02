del /q src\components\cvs\*.*
rmdir src\components\cvs
del /q src\components\maf.0.4.1.xpt
del /q src\components\maf.0.4.3.xpt
del /q src\components\maf.0.5.0.xpt
del /q src\components\maf.0.5.1.xpt
del /q src\components\maf.0.6.0.xpt
del /q src\components\maf.0.6.1.xpt
del /q src\components\maf.0.6.2.xpt

del /q src\maf\cvs\*.*
rmdir src\maf\cvs
del /q src\maf\content\cvs\*.*
rmdir src\maf\content\cvs
del /q src\maf\locale\cvs\*.*
rmdir src\maf\locale\cvs
del /q src\maf\locale\en-US\cvs\*.*
rmdir src\maf\locale\en-US\cvs
del /q src\maf\locale\fr-FR\cvs\*.*
rmdir src\maf\locale\fr-FR\cvs
del /q src\maf\locale\it-IT\cvs\*.*
rmdir src\maf\locale\it-IT\cvs
del /q src\maf\locale\pl-PL\cvs\*.*
rmdir src\maf\locale\pl-PL\cvs
del /q src\maf\locale\ru-RU\cvs\*.*
rmdir src\maf\locale\ru-RU\cvs

del /q src\scripts\cvs\*.*
rmdir src\scripts\cvs
del /q src\libs\cvs\*.*
rmdir src\libs\cvs

mkdir build
cd build
del /q maf-0.6.3.xpi
mkdir common
cd common
mkdir chrome
cd ..\..\src\maf
del /q ..\..\build\common\chrome\maf.jar
..\scripts\zip -r ..\..\build\common\chrome\maf.jar .
cd ..\..\build\common
..\..\src\scripts\zip -r ..\maf-0.6.3.xpi .
cd ..\..\src
scripts\zip -r ..\build\maf-0.6.3.xpi install.* maf.html components scripts libs
cd ..
