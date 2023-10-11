[PACFramework tools](README.md)

# Утиліти розгортання та роботи з Unity PRO/Control Expert



## Перелік утиліт

Створення файлів для імпорту з JSON Masterdata (XLSX -> JSON -> UnityPRO)

- `seuncreateall` -  створення усіх файлів для імпорту в Uity PRO/Cotrol Expert з майстерданих формату Excel 

- `seuncreatechs` - створення файлів для імпорту каналів та карти I/O в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- `seuncreatevars` - створення файлів для імпорту технологічних змінних в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- `seuncreateacts` - створення файлів для імпорту ВМ в Uity PRO/Cotrol Expert з майстерданих формату Excel 

Створення файлів JSON Masterdata з файлів експорту Uity PRO/Cotrol Expert

- `seunparseall` -  створення файлів JSON Masterdata з файлу експорту *.xef

## Налаштування ini

```ini
[seunparsetools]
pathsource = C:\Users\OleksandrPupena\pacframeworktools\source
pathresult = C:\Users\OleksandrPupena\pacframeworktools\result
pathlog = C:\Users\OleksandrPupena\pacframeworktools\log
xeffile = byton_plc1; файл експорту *.xef
tag_typeblocknames = {"VARS":"VARS", "DIH":"DIH", "DOH":"DOH", "AIH":"AIH", "AOH":"AOH", "VARBUF":"VARBUF"} 
tag_varblocknames = {"VARS":"VARS", "DIH":"DIH", "DOH":"DOH", "AIH":"AIH", "AOH":"AOH", "VARBUF":"VARBUF"}

[seuncreatetools]
plctype = M340; тип ПЛК M580
```

