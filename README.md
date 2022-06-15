# PACFramework tools

Програмні утиліти для автоматизації процесів розробки [PACFramework](https://github.com/pupenasan/PACFramework) та [PACFramework IoT Gateway](https://github.com/pupenasan/PACFrameworkIoTGateway). Утиліти призначені виключно сумісно з ресурсами розробленими відповідно до правил каркасу PACFramework. 

## Інсталювання

Передбачається що утиліти використовуватимуться на ОС Windows 10. Для використання утиліт необхідно:

- завантажити останню версію Node.JS з сайту <https://nodejs.org/uk/> (LTS версію).

- створити директорію, куди будуть інтсталюватися застосунок та бібліотеки, наприклад `C:\pacfwtools`:

  ```
  md C:\pacfwtools
  ```

- з командного вікна перейти в директорію застосунку запустити команду для інсталювання застосунку, який поставить останню версію pacframework-tools:

```
cd C:\pacfwtools
npm install pacframework-tools@latest
```

- зробити ініціалізацію застосунку, що створить необхідну робочу папку в домашній директорії користувача (`%Userprofile%\pacframeworktools\`) та файли:

```
node C:\pacfwtools\node_modules\pacframework-tools\index
```

Можна звантажити і запустити командний файл `install.cmd` з директорії репозиторія, який має наступний зміст

```bash
md C:\pacfwtools
cd C:\pacfwtools
npm install pacframework-tools@latest
node C:\pacfwtools\node_modules\pacframework-tools\index
explorer \n, "%Userprofile%\pacframeworktools\"
```

## Оновлення

Для оновлення до останньої версії треба з командного вікна перейти в директорію застосунку запустити команду для інсталювання застосунку, який поставить останню версію pacframework-tools:

```bash
cd C:\pacframeworktools
npm install pacframework-tools@latest
```

## Загальні принципи використання

Утиліти написані на Node.js.  

Утиліти запускаються з командного рядку Windows. За необхідності частого виклику утиліт, варто створити командний файл, та запускати його за необхідності звичайним кліком.

Для роботи з утилітами є дві директорії:

- директорія з кодом утиліт, наприклад  `C:\pacfwtools`
- робоча директорія, завжди  `%Userprofile%\pacframeworktools\`

Для запуску утиліт з командного рядку, необхідно вказувати повний шлях до файлу `index.js` і назву утиліти, наприклад виклик утиліти-парсера файлів TIA треба викликати наступну команду:  

```bash
node C:\pacfwtools\node_modules\pacframework-tools\index tiaparseall
```

При використанні командних файлів, можна використовувати команду pause, щоб побачити результат виконання, наприклад:

```bash
node C:\pacfwtools\node_modules\pacframework-tools\index tiaparseall
pause
```

 Для налаштування параметрів роботи утиліт використовується `config.ini`

## Перелік утиліт для користувача

Дані утиліти вказуються в якості аргументу при виклику. Наприклад утиліта `tiaparseall` викликається так:

```bash
node C:\pacfwtools\node_modules\pacframework-tools\index tiaparseall
```

Нижче наведений перелік утиліт, які може запускати користувач.  

- [getcfgfromxls](masredataxls.md) - отримання майстерданих (проектних даних) з формату Excel в JSON 
- seuncreateall -  створення усіх файлів для імпорту в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- seuncreatechs - створення файлів для імпорту каналів та карти I/O в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- seuncreatevars - створення файлів для імпорту технологічних змінних в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- seuncreateacts - створення файлів для імпорту ВМ в Uity PRO/Cotrol Expert з майстерданих формату Excel 
- tiacreateall - створення усіх файлів для імпорту в TIA portal з майстерданих формату Excel 
- tiaparseall - отримання майстерданих (проектних даних) з TIA portal та перетворення їх в JSON з оновленням в CouchDB
- wincccreatealm - створення списку тривог в форматі CSV для WinCC Prof
- updateui2 - створення наповнення графічного інтерфейсу для PACFramework IoT Gateway 
-  citectcreateeqip - створення всього обладнання з експортного варіанту Unity
- citectcreateacteqip - створення обладнання ВМ з експортного варіанту Unity
- citectcreatehmi - створення джинів для всього обладнання каркасу
- citectcreatevarhmi -  створення джинів налагодження для технологічних змінних
- citectcreateplcmaphmi - створення джинів налагодження для карти ПЛК
- citectcreateacthmi - створення джинів налагодження для ВМ
- 

## Перелік утиліт для програміста

