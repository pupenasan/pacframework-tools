# PACFramework tools

Програмні утиліти для автоматизації процесів розробки [PACFramework](https://github.com/pupenasan/PACFramework) та [PACFramework IoT Gateway](https://github.com/pupenasan/PACFrameworkIoTGateway). 

## Інсталяція

Передбачається що утиліти вкористовуватимуться на ОС Windows 10. Для використання утиліт необхідно:

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

- зробити ініціалізацію застосунку, що створить необхідну робочц папку в домашній диеркторії користувача (`%Userprofile%\pacframeworktools\`) та файли:

```
node C:\pacfwtools\node_modules\pacframework-tools\index
```

Можна завнтажити і запустити командний файл `install.cmd` з директорії репозиторія, який має наступний зміст

```bash
md C:\pacfwtools
cd C:\pacfwtools
npm install pacframework-tools@latest
node C:\pacfwtools\node_modules\pacframework-tools\index
explorer \n, "%Userprofile%\pacframeworktools\"
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