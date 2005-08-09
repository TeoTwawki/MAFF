del /y src\components\cvs\*.*
rmdir src\components\cvs
del /y src\components\maf.0.4.1.xpt
del /y src\components\maf.0.4.3.xpt
del /y src\components\maf.0.5.0.xpt
del /y src\components\maf.0.5.1.xpt
del /y src\components\maf.0.6.0.xpt
del /y src\components\maf.0.6.1.xpt
del /y src\components\maf.0.6.2.xpt

del /y src\maf\cvs\*.*
rmdir src\maf\cvs
del /y src\maf\content\cvs\*.*
rmdir src\maf\content\cvs
del /y src\maf\locale\cvs\*.*
rmdir src\maf\locale\cvs
del /y src\maf\locale\en-US\cvs\*.*
rmdir src\maf\locale\en-US\cvs
del /y src\maf\locale\fr-FR\cvs\*.*
rmdir src\maf\locale\fr-FR\cvs
del /y src\maf\locale\it-IT\cvs\*.*
rmdir src\maf\locale\it-IT\cvs
del /y src\maf\locale\pl-PL\cvs\*.*
rmdir src\maf\locale\pl-PL\cvs
del /y src\maf\locale\ru-RU\cvs\*.*
rmdir src\maf\locale\ru-RU\cvs

del /y src\scripts\cvs\*.*
rmdir src\scripts\cvs
del /y src\libs\cvs\*.*
rmdir src\libs\cvs

mkdir build
cd build
del /y maf-0.6.3.xpi
mkdir common
cd common
mkdir chrome
cd ..\..\src\maf
del /y ..\..\build\common\chrome\maf.jar
..\scripts\zip -r ..\..\build\common\chrome\maf.jar .
cd ..\..\build\common
..\..\src\scripts\zip -r ..\maf-0.6.3.xpi .
cd ..\..\src
scripts\zip -r ..\build\maf-0.6.3.xpi install.* maf.html components scripts
cd ..
