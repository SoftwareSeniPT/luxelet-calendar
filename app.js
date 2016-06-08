var jQuery = window.jQuery, moment = window.moment;
var calendarInstance = [];
var Calendar = (function () {
    function Calendar() {
    }
    Calendar.load = function (callback) {
        jQuery.get("calendar.json", function (calendar) {
            callback(JSON.parse(calendar));
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
                var info = [{
                        name: "Agent",
                        value: label
                    }, {
                        name: "Check In",
                        value: moment(new Date(formattedFrom)).format('DD MM YYYY')
                    }, {
                        name: "Check Out",
                        value: moment(new Date(formattedTo)).format('DD MM YYYY')
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
                events: formattedEvents.concat(tempEvents)
            };
        });
        callback(formatted);
    };
    Calendar.initClndrHeader = function () {
        var CLNDR = jQuery("#calendar-header").clndr({
            showAdjacentMonths: false,
            template: jQuery('#calendar-header-template').html()
        });
        calendarInstance.push(CLNDR);
    };
    Calendar.initClndr = function (formattedData, callback) {
        jQuery.each(formattedData, function (i, o) {
            var name = o.name, events = o.events;
            var calendarElement = jQuery('#calendar')
                .append("<div class=\"lx-property\">\n        <div class=\"lx-name\">\n          <div class=\"lx-name-inner\">\n            <span>" + name + "</span>\n          </div>\n        </div>\n        <div class=\"lx-calendar clndr-" + i + "\"></div>\n      </div>")
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
            ins.setMonth(month, { withCallbacks: true });
        }, callback);
    };
    Calendar.changeYear = function (year, instance, callback) {
        if (instance === void 0) { instance = []; }
        Calendar.loopInstance(instance, function (ins) {
            ins.setYear(year, { withCallbacks: true });
        }, callback);
    };
    Calendar.forward = function (instance, callback) {
        Calendar.loopInstance(instance, function (ins) {
            ins.forward();
        }, callback);
    };
    Calendar.back = function (instance, callback) {
        Calendar.loopInstance(instance, function (ins) {
            ins.back();
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
        jQuery("#lx-month-picker").val(month);
        jQuery("#lx-month-year").val(year);
    };
    return Calendar;
}());
jQuery(document).ready(function () {
    var load = Calendar.load, formatJson = Calendar.formatJson, initClndr = Calendar.initClndr, initClndrHeader = Calendar.initClndrHeader, changeCalendar = Calendar.changeCalendar, label = Calendar.label, changeOnNav = Calendar.changeOnNav, selectDefaultDate = Calendar.selectDefaultDate;
    selectDefaultDate();
    load(function (calendar) { return formatJson(calendar, function (formatted) {
        initClndrHeader();
        initClndr(formatted, function (calendarInstance) {
            label();
            changeCalendar(calendarInstance, function () {
                label();
            });
            changeOnNav(calendarInstance, function () {
                label();
            });
        });
    }); });
});
jQuery(window).resize(function () {
    var label = Calendar.label;
    label();
});
