(function () {
  // Create the connector object
  var myConnector = tableau.makeConnector();

  // Define the schema
  myConnector.getSchema = function (schemaCallback) {
      var cols = [{
              id: "id",
              dataType: tableau.dataTypeEnum.int,
          },
          {
              id: "month",
              dataType: tableau.dataTypeEnum.string,
          },
          {
              id: "name",
              alias: "name",
              dataType: tableau.dataTypeEnum.string,
          },
          {
              id: "employeeName",
              dataType: tableau.dataTypeEnum.string,
          },
          {
              id: "effortForPeriod",
              alias: "effortForPeriod",
              dataType: tableau.dataTypeEnum.int,
          },
          {
              id: "officeId",
              dataType: tableau.dataTypeEnum.string,
          },
          {
              id: "employeeLogin",
              dataType: tableau.dataTypeEnum.string,
          },
      ];

      var tableSchema = {
          id: "TTT_Efforts",
          alias: "TTT Efforts",
          columns: cols
      };

      schemaCallback([tableSchema]);
  };

  var API_KEY = "07286f74-5fff-49ae-9b23-c2b200770e94";
  var BASE_URL =
      "https://ttt-dev-new.noveogroup.com/api/ttt/v1/statistic/projects/employees?";

  var PERIODS = [];

  /**
   * Создает URL адрес для получения статистики за текущий промежуток.
   * @param {string} startDate 
   * @param {string} endDate 
   */
  var createURL = function (startDate, endDate) {
      return BASE_URL + "startDate=" + startDate + "&" + "endDate=" + endDate;
  };

  /**
   * Вычисляет последний день в месяце. Умеет работать с високосным годом.
   * @param {string} date 
   */
  var calcLastDay = (date) => {
      var currentDate = new Date(date);
      var lastDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
      );
      return lastDay.getDate();
  };

  /**
   * Создает шаблонный объект для создания запроса на сервер.
   * Применяются особые условия для первого и последнего запросов из периода т.к. пользователь не обязательно
   * будет запрашивать данные с начала по конец месяца.
   * @param {number} index 
   * @param {number} maxIndex 
   * @param {string} firstDate - данные из настроек пользователя. Дата начала сбора статистики.
   * @param {string} lastDate - данные из настроек пользователя. Дата конца сбора статистики.
   */
  var createPeriodRequestObject = (index, maxIndex, firstDate, lastDate) => {
      var date = new Date(firstDate);
      var startMonth = date.getMonth();
      var startYear = date.getFullYear();
      var newDate = new Date(startYear, startMonth + index, 1);

      var year = newDate.getFullYear();

      // Если номер месяца меньше 10, то нужно приписать "0" перед ним.
      var month = newDate.getMonth() + 1 >= 9 ? newDate.getMonth() + 1 : `0${newDate.getMonth() + 1}`;

      // Обрабатываем кейс если день в startDate не будет началом месяца.
      if (index === 0) {
          return {
              id: index + 1,
              startDate: firstDate,
              endDate: `${year}-${month}-${calcLastDay(newDate)}`,
          };
      }

      // Обрабатываем кейс если день в endDate не будет концом месяца.
      if (index === maxIndex) {
          return {
              id: index + 1,
              startDate: `${year}-${month}-01`,
              endDate: lastDate,
          };
      }

      return {
          id: index + 1,
          startDate: `${year}-${month}-01`,
          endDate: `${year}-${month}-${calcLastDay(newDate)}`,
      };
  };

  /**
   * Вычисляет количество месячных периодов между startDate и endDate.
   * Создает массив объектов, которые будут использованы для создания запросов на сервер.
   * @param {string} startDate 
   * @param {string} endDate
   * @returns {
   *  id: number,
   *  startDate: string,
   *  endDate: string,
   * }[],
   */
  var createDatesArray = (startDate, endDate) => {
      var datesArray = [];
      var start = new Date(startDate);
      var end = new Date(endDate);
      var basicMonthDiff = (end.getFullYear() - start.getFullYear()) * 12 + 1;
      basicMonthDiff -= start.getMonth();
      basicMonthDiff += end.getMonth();
      for (var index = 0; index < basicMonthDiff; index++) {
          datesArray.push(
              createPeriodRequestObject(index, basicMonthDiff - 1, startDate, endDate)
          );
      }

      return datesArray;
  };

  // Download the data
  myConnector.getData = function (table, doneCallback) {
      var { startDate, endDate, isSingleRadioChecked } = JSON.parse(tableau.connectionData);
      console.log(startDate, endDate, isSingleRadioChecked);

      // Конфигурируем заголовки для AJAX- запросов.
      $.ajaxSetup({
          headers: {
              API_SECRET_TOKEN: API_KEY,
              accept: "application/json",
          },
      });

      var tableData = [];

      /**
       * Создает из полученного ответа массив со строками для таблицы
       * @param {object} resp - ответ от сервера
       * @param {number} requestId - порядковый номер запроса в массиве PERIODS
       * @param {*} startDate - дата с которой начался период за который получаем статистику. Используется в таблице.
       */
      var transformJSON = function (resp, requestId, startDate) {
          var pages = resp;
          var tableDataForCurrentMonth = [];

          // Iterate over the JSON object
          for (var i = 0, len = pages.length; i < len; i++) {
              var currentPage = pages[i];
              var employees = currentPage.childNodeList;

              for (
                  var employee = 0, employeesTotal = employees.length; employee < employeesTotal; employee++
              ) {
                  tableDataForCurrentMonth.push({
                      id: currentPage.id,
                      month: startDate,
                      name: currentPage.name,
                      employeeName: employees[employee].name,
                      effortForPeriod: employees[employee].effortForPeriod,
                      officeId: employees[employee].officeId,
                      employeeLogin: employees[employee].login,
                  });
              }
          }
          tableData[requestId - 1] = tableDataForCurrentMonth;
      };

      if (startDate !== "" && endDate !== "") {
          if (isSingleRadioChecked) {
              PERIODS.push({
                  startDate,
                  endDate,
                  id: 1,
              });
          } else {
              PERIODS = createDatesArray(startDate, endDate);
          }
      }

      var createTable = function (tableData) {
          tableData.forEach(function (dataByMonthArray) {
              table.appendRows(dataByMonthArray);
          });
      };

      // Save all requests in an array of jqXHR objects
      var requests = PERIODS.map(function (dateObject) {
          var {
              id,
              startDate,
              endDate
          } = dateObject;

          console.log(id, startDate, endDate);

          return $.ajax({
              method: "GET",
              url: createURL(startDate, endDate),
              success: (data) => transformJSON(data, id, startDate),
          });
      });

      $.when.apply(this, requests).then(function () {
          // Each argument is an array with the following structure: [ data, statusText, jqXHR ]
          console.log("Finished");
          createTable(tableData);
          doneCallback();
      });
  };

  tableau.registerConnector(myConnector);

  // Create event listeners for when the user submits the form
  $(document).ready(function () {
      $("#submitButton").click(function () {
          var dateObj = {
              startDate: $('#startDate').val().trim(),
              endDate: $('#endDate').val().trim(),
              isSingleRadioChecked: $('#singlePeriod').is(':checked'),
          };
  
          function isValidDate(dateStr) {
              var d = new Date(dateStr);
              return !isNaN(d.getDate());
          }
  
          if (isValidDate(dateObj.startDate) && isValidDate(dateObj.endDate)) {
              tableau.connectionData = JSON.stringify(dateObj);
              tableau.connectionName = "TTT Efforts";
              tableau.submit();
          } else {
              $('#errorMsg').html("Enter valid dates. For example, 2016-05-08.");
          }
      });
  });
})();
