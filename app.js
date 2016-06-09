var jQuery = window.jQuery, moment = window.moment;
var calendarInstance = [];
var Calendar = (function () {
    function Calendar() {
    }
    Calendar.load = function (source, callback) {
        jQuery.get(source, function (calendar) {
            callback(calendar);
        });
    };
    Calendar.extractDate = function (date) {
        var regex = /\/Date\(([0-9+]*?)\)\//;
        var formattedFrom;
        if (regex.test(date)) {
            formattedFrom = date.match(regex)[1];
        }
        return parseInt(formattedFrom);
    };
    Calendar.formatJson = function (calendar, callback) {
        var formatted = calendar.map(function (cal, key) {
            var tempEvents = [];
            var occupancyTotal = 0;
            var name = cal.name, _a = cal.values, values = _a === void 0 ? [] : _a;
            var formattedName = jQuery(name).find("strong").text();
            var formattedEvents = values.map(function (event, key) {
                var customClass = event.customClass, dataObj = event.dataObj, desc = event.desc, from = event.from, label = event.label, to = event.to;
                var status;
                var statusLabel;
                switch (customClass) {
                    case "ganttRed":
                        status = "confirmed";
                        statusLabel = "Booked by Owner";
                        break;
                    case "ganttOrange":
                        status = "awaiting-balance";
                        statusLabel = "Awaiting Balance";
                        break;
                    case "ganttGrey":
                        status = "completed";
                        statusLabel = "Fully Paid";
                        break;
                    default:
                        status = "on-hold";
                        statusLabel = "On Hold";
                }
                var formattedFrom = Calendar.extractDate(from);
                var formattedTo = Calendar.extractDate(to);
                function getStayDayLength(from, to) {
                    var oneDay = 24 * 60 * 60 * 1000;
                    return Math.round(Math.abs((from - to) / (oneDay)));
                }
                if (status !== "on-hold") {
                    occupancyTotal = occupancyTotal + getStayDayLength(formattedFrom, formattedTo);
                }
                var info = [{
                        name: "Agent",
                        value: label
                    }, {
                        name: "Check In",
                        value: moment(new Date(formattedFrom)).format('DD MMMM YYYY')
                    }, {
                        name: "Check Out",
                        value: moment(new Date(formattedTo)).format('DD MMMM YYYY')
                    }, {
                        name: "Status",
                        value: statusLabel
                    }];
                tempEvents.push({
                    status: "first-day",
                    date: new Date(formattedFrom),
                    dayLabel: label,
                    dayStay: getStayDayLength(formattedFrom, formattedTo),
                    info: JSON.stringify(info)
                });
                tempEvents.push({
                    status: "last-day",
                    date: new Date(formattedTo),
                    dayLabel: label,
                    dayStay: getStayDayLength(formattedFrom, formattedTo),
                    info: JSON.stringify(info)
                });
                return {
                    status: status,
                    link: dataObj,
                    from: formattedFrom,
                    to: formattedTo,
                    startDate: new Date(formattedFrom),
                    endDate: new Date(formattedTo),
                    stay: getStayDayLength(formattedFrom, formattedTo),
                    info: [],
                    label: label
                };
            });
            return {
                name: formattedName,
                events: formattedEvents.concat(tempEvents),
                occupancyTotal: occupancyTotal
            };
        });
        callback(formatted);
    };
    Calendar.changeDatePicker = function (month, year) {
        jQuery("#lx-month-picker").val(month);
        jQuery("#lx-month-year").val(year);
    };
    Calendar.initClndrHeader = function () {
        var CLNDR = jQuery("#calendar-header").clndr({
            showAdjacentMonths: false,
            template: jQuery('#calendar-header-template').html(),
            clickEvents: {
                onMonthChange: function (month) {
                    var momentMonth = moment(month).format("M");
                    var momentYear = moment(month).format("YYYY");
                    Calendar.changeDatePicker(momentMonth, momentYear);
                },
                onYearChange: function (month) {
                    var momentMonth = moment(month).format("M");
                    var momentYear = moment(month).format("YYYY");
                    Calendar.changeDatePicker(momentMonth, momentYear);
                }
            }
        });
        calendarInstance.push(CLNDR);
    };
    Calendar.initClndr = function (formattedData, callback) {
        jQuery.each(formattedData, function (i, o) {
            var name = o.name, events = o.events;
            var calendarElement = jQuery('#calendar')
                .append("<div class=\"lx-property\">\n        <div class=\"lx-name\">\n          <div class=\"lx-name-inner\">\n            <span>" + name + "</span>\n          </div>\n        </div>\n        <div class=\"lx-occ\">\n          <div class=\"lx-occ-inner\">3.3</div>\n        </div>\n        <div class=\"lx-calendar clndr-" + i + "\"></div>\n      </div>")
                .find(".clndr-" + i);
            var CLNDR = calendarElement.clndr({
                showAdjacentMonths: false,
                template: jQuery('#calendar-template').html(),
                events: events,
                multiDayEvents: {
                    singleDay: 'date',
                    endDate: 'endDate',
                    startDate: 'startDate'
                }
            });
            calendarInstance.push(CLNDR);
            if (i === formattedData.length - 1) {
                callback(calendarInstance);
            }
        });
    };
    Calendar.loopInstance = function (instance, process, callback) {
        if (instance === void 0) { instance = []; }
        if (!instance.length) {
            return;
        }
        instance.map(function (ins, key) {
            process(ins);
            if (key === instance.length - 1) {
                callback();
            }
        });
    };
    Calendar.changeMonth = function (month, instance, callback) {
        if (instance === void 0) { instance = []; }
        Calendar.loopInstance(instance, function (ins) {
            ins.setMonth(month);
        }, callback);
    };
    Calendar.changeYear = function (year, instance, callback) {
        if (instance === void 0) { instance = []; }
        Calendar.loopInstance(instance, function (ins) {
            ins.setYear(year);
        }, callback);
    };
    Calendar.forward = function (instance, callback) {
        Calendar.loopInstance(instance, function (ins) {
            ins.forward({ withCallbacks: true });
        }, callback);
    };
    Calendar.back = function (instance, callback) {
        Calendar.loopInstance(instance, function (ins) {
            ins.back({ withCallbacks: true });
        }, callback);
    };
    Calendar.changeOnNav = function (instance, callback) {
        if (instance === void 0) { instance = []; }
        jQuery(document).on("click", "#lx-back", function () {
            Calendar.back(instance, callback);
        });
        jQuery(document).on("click", "#lx-forward", function () {
            Calendar.forward(instance, callback);
        });
    };
    Calendar.changeCalendar = function (instance, callback) {
        if (instance === void 0) { instance = []; }
        jQuery("#lx-month-picker").change(function (e) {
            var value = parseInt(jQuery(e.target).val());
            Calendar.changeMonth(value, instance, callback);
        });
        jQuery("#lx-month-year").change(function (e) {
            var value = parseInt(jQuery(e.target).val());
            Calendar.changeYear(value, instance, callback);
        });
    };
    Calendar.label = function () {
        jQuery(".first-day").each(function (i, o) {
            var calendarWidth = jQuery(".lx-calendar").first().outerWidth();
            var widthPixel = 0.0322581 * calendarWidth;
            var stay = parseInt(jQuery(o).data("stay"));
            var label = jQuery(o).data("label");
            var infoObject = JSON.parse(jQuery(o).attr("data-info"));
            var tooltips = [];
            if (!jQuery(o).find(".lx-label").length) {
                var labelElm = jQuery(o).append("<div class='lx-label'><span>" + label + "</span></div>");
            }
            jQuery(o).find(".lx-label").css("width", widthPixel * (stay + 1));
            if (infoObject.length) {
                infoObject.map(function (info, key) {
                    var name = info.name, value = info.value;
                    tooltips.push("<div class='info-item'><div class='name'>" + name + "</div><div class='value'>" + value + "</div></div>");
                });
                if (!jQuery(o).find(".lx-tooltips").length) {
                    jQuery(o).append("<div class='lx-tooltips' style='width:" + widthPixel * (stay + 1) + "px'>\n            <div class=\"lx-tooltip-inner\">" + tooltips.join("") + "</div>\n          </div>");
                }
                jQuery(o).find(".lx-tooltips").css("width", widthPixel * (stay + 1));
            }
        });
    };
    Calendar.selectDefaultDate = function () {
        var month = moment().format("M");
        var year = moment().format("YYYY");
        Calendar.changeDatePicker(month, year);
    };
    Calendar.calculateOccupation = function () {
        var totalDay = jQuery(".lx-header-property-date .days .day").length;
        jQuery(".lx-property").each(function (i, o) {
            var days = jQuery(o).find(".event").not(".on-hold, .last-day").length;
            function roundToTwo(num) {
                var n = num + "e+2";
                return +(Math.round(n) + "e-2");
            }
            jQuery(o).find(".lx-occ-inner").text(roundToTwo((days / totalDay) * 100) + "%");
            jQuery(o).attr("data-occ-total", days);
            jQuery(o).attr("data-total-day", totalDay);
        });
    };
    Calendar.DOMProcess = function () {
        var calculateOccupation = Calendar.calculateOccupation, label = Calendar.label;
        calculateOccupation();
        label();
    };
    Calendar.jumpToMonthHandler = function (instance, callback) {
        jQuery("#jump-to-last-month").click(function () {
            Calendar.loopInstance(instance, function (ins) {
                var month = moment().subtract(1, 'months').format("M");
                ins.setMonth(parseInt(month) - 1, { withCallbacks: true });
            }, callback);
        });
        jQuery("#jump-to-this-month").click(function () {
            Calendar.loopInstance(instance, function (ins) {
                var month = moment().format("M");
                ins.setMonth(parseInt(month) - 1, { withCallbacks: true });
            }, callback);
        });
        jQuery("#jump-to-next-month").click(function () {
            Calendar.loopInstance(instance, function (ins) {
                var month = moment().add(1, 'months').format("M");
                ins.setMonth(parseInt(month) - 1, { withCallbacks: true });
            }, callback);
        });
    };
    return Calendar;
}());
jQuery(document).ready(function () {
    var load = Calendar.load, formatJson = Calendar.formatJson, initClndr = Calendar.initClndr, initClndrHeader = Calendar.initClndrHeader, changeCalendar = Calendar.changeCalendar, DOMProcess = Calendar.DOMProcess, changeOnNav = Calendar.changeOnNav, selectDefaultDate = Calendar.selectDefaultDate, jumpToMonthHandler = Calendar.jumpToMonthHandler;
    selectDefaultDate();
    load("http://softwaresenipt.github.io/luxelet-calendar/calendar.json", function (calendar) { return formatJson(calendar, function (formatted) {
        initClndrHeader();
        initClndr(formatted, function (calendarInstance) {
            DOMProcess();
            changeCalendar(calendarInstance, function () {
                DOMProcess();
            });
            changeOnNav(calendarInstance, function () {
                DOMProcess();
            });
            jumpToMonthHandler(calendarInstance, function () {
                DOMProcess();
            });
            console.log(formatted, "done!");
        });
    }); });
});
jQuery(window).resize(function () {
    var label = Calendar.label;
    label();
});
