(function () {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var cols = [{
            id: "id",
            dataType: tableau.dataTypeEnum.int
        }, {
            id: "month",
            dataType: tableau.dataTypeEnum.int
        }, {
            id: "name",
            alias: "name",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "employeeName",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "effortForPeriod",
            alias: "effortForPeriod",
            dataType: tableau.dataTypeEnum.int
        }, {
            id: "officeId",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "employeeLogin",
            dataType: tableau.dataTypeEnum.string
        }];

        var tableSchema = {
            id: "efforts",
            alias: "TTT Efforts",
            columns: cols
        };

        schemaCallback([tableSchema]);
    };

    var API_KEY = "07286f74-5fff-49ae-9b23-c2b200770e94";
    var BASE_URL = "https://ttt-dev-new.noveogroup.com/api/ttt/v1/statistic/projects/employees?";

    var createURL = function (startDate, endDate) {
        return BASE_URL + "startDate=" + startDate + "&" + "endDate=" + endDate;
    }

    // Download the data
    myConnector.getData = function (table, doneCallback) {
        $.ajaxSetup({
            headers: {
                'API_SECRET_TOKEN': API_KEY,
                accept: 'application/json',
            }
        });

        var PERIODS = [{
            id: 1,
            startDate: '01-01',
            endDate: '01-31',
        }, {
            id: 2,
            startDate: '02-01',
            endDate: '02-29',
        }, {
            id: 3,
            startDate: '03-01',
            endDate: '03-31',
        }, {
            id: 4,
            startDate: '04-01',
            endDate: '04-30',
        }, {
            id: 5,
            startDate: '05-01',
            endDate: '05-31',
        }, {
            id: 6,
            startDate: '06-01',
            endDate: '06-30',
        }, {
            id: 7,
            startDate: '07-01',
            endDate: '07-31',
        }, {
            id: 8,
            startDate: '08-01',
            endDate: '08-31',
        }, {
            id: 9,
            startDate: '09-01',
            endDate: '09-30',
        }, {
            id: 10,
            startDate: '10-01',
            endDate: '10-31',
        }, {
            id: 11,
            startDate: '11-01',
            endDate: '11-30',
        }, {
            id: 12,
            startDate: '12-01',
            endDate: '12-31',
        }];

        var YEAR = '2020';
        var tableData = [];
        var transformJSON = function (resp, monthId) {
            var pages = resp;
            var tableDataForCurrentMonth = [];

            // Iterate over the JSON object
            for (var i = 0, len = pages.length; i < len; i++) {
                var currentPage = pages[i];
                var employees = currentPage.childNodeList;

                for (var employee = 0, employeesTotal = employees.length; employee < employeesTotal; employee++) {
                    tableDataForCurrentMonth.push({
                        "id": currentPage.id,
                        "month": monthId,
                        "name": currentPage.name,
                        "employeeName": employees[employee].name,
                        "effortForPeriod": employees[employee].effortForPeriod,
                        "officeId": employees[employee].officeId,
                        "employeeLogin": employees[employee].login,
                    });
                }
            }
            tableData[monthId - 1] = tableDataForCurrentMonth;
            console.log('Data was received', monthId);
        };

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

            return $.ajax({
                method: 'GET',
                url: createURL(`${YEAR}-${startDate}`, `${YEAR}-${endDate}`),
                success: (data) => transformJSON(data, id),
            });
        });

        $.when.apply(this, requests).then(function () {
            // Each argument is an array with the following structure: [ data, statusText, jqXHR ]
            console.log('Finished');
            createTable(tableData);
            doneCallback();
        });
    };

    tableau.registerConnector(myConnector);

    // Create event listeners for when the user submits the form
    $(document).ready(function () {
        $("#submitButton").click(function () {
            tableau.connectionName = "TTT Efforts"; // This will be the data source name in Tableau
            tableau.submit(); // This sends the connector object to Tableau
        });
    });
})();