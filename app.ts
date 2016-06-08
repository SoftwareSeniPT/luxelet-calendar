const {jQuery, moment}: any = window;

let calendarInstance = [];
class Calendar {
  static load(callback) {
    jQuery.get("./calendar.json", function(calendar) {
      callback(JSON.parse(calendar));
    });
  }

  static extractDate(date) {
    const regex = /\/Date\(([0-9+]*?)\)\//;
    let formattedFrom;
    if (regex.test(date)) {
      formattedFrom = date.match(regex)[1];
    }
    return parseInt(formattedFrom);
  }

  static formatJson(calendar, callback) {
    const formatted = calendar.map((cal, key) => {
      let tempEvents = [];
      const {name, values = []} = cal;
      const formattedName = jQuery(name).find("strong").text();
      const formattedEvents = values.map((event, key) => {
        const {customClass, dataObj, desc, from, label, to} = event;

        // Get event status
        let status;
        let statusLabel;
        switch(customClass) {
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
            statusLabel = "Fully Paid"
            break;
          default:
            status = "on-hold";
            statusLabel = "On Hold"
        }

        // Get Date
        const formattedFrom = Calendar.extractDate(from);
        const formattedTo = Calendar.extractDate(to);

        function getStayDayLength(from, to) {
          const oneDay = 24*60*60*1000;
          return Math.round(Math.abs((from - to)/(oneDay)))
        }

        // Create information instance
        const info = [{
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
        }]

        // Create new event for first day
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
          label
        }
      });

      return {
        name: formattedName,
        events: formattedEvents.concat(tempEvents)
      };
    });
    callback(formatted);
  }

  static initClndrHeader() {
    const CLNDR = jQuery("#calendar-header").clndr({
      showAdjacentMonths: false,
      template: jQuery('#calendar-header-template').html()
    });
    calendarInstance.push(CLNDR);
  }

  static initClndr(formattedData, callback) {
    jQuery.each(formattedData, (i, o) => {
      const {name, events} = o;
      const calendarElement = jQuery('#calendar')
      .append(`<div class="lx-property">
        <div class="lx-name">
          <div class="lx-name-inner">
            <span>${name}</span>
          </div>
        </div>
        <div class="lx-calendar clndr-${i}"></div>
      </div>`)
      .find(`.clndr-${i}`)

      const CLNDR = calendarElement.clndr({
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
  }

  static loopInstance(instance = [], process, callback?) {
    if (!instance.length) {
      return;
    }
    instance.map((ins, key) => {
      process(ins);
      if (key === instance.length - 1) {
        callback();
      }
    });
  }

  static changeMonth(month, instance = [], callback?) {
    Calendar.loopInstance(instance, (ins) => {
      ins.setMonth(month, { withCallbacks: true });
    }, callback);
  }

  static changeYear(year, instance = [], callback?) {
    Calendar.loopInstance(instance, (ins) => {
      ins.setYear(year, { withCallbacks: true });
    }, callback);
  }

  static forward(instance, callback?) {
    Calendar.loopInstance(instance, (ins) => {
      ins.forward();
    }, callback);
  }

  static back(instance, callback?) {
    Calendar.loopInstance(instance, (ins) => {
      ins.back();
    }, callback);
  }

  static changeOnNav(instance = [], callback?) {
    jQuery(document).on("click", "#lx-back", () => {
      Calendar.back(instance, callback);
    });
    jQuery(document).on("click", "#lx-forward", () => {
      Calendar.forward(instance, callback);
    });
  }

  static changeCalendar(instance = [], callback?) {
    jQuery("#lx-month-picker").change((e) => {
      const value = parseInt(jQuery(e.target).val());
      Calendar.changeMonth(value, instance, callback);
    });
    jQuery("#lx-month-year").change((e) => {
      const value = parseInt(jQuery(e.target).val());
      Calendar.changeYear(value, instance, callback);
    });
  }

  static label() {
    jQuery(".first-day").each((i, o) => {
      // Get calendar width
      const calendarWidth = jQuery(".lx-calendar").first().outerWidth();
      const widthPixel = 0.0322581 * calendarWidth;

      const stay = parseInt(jQuery(o).data("stay"));
      const label = jQuery(o).data("label");

      const infoObject = JSON.parse(jQuery(o).attr("data-info"));
      const tooltips = [];

      if (!jQuery(o).find(".lx-label").length) {
        const labelElm = jQuery(o).append(`<div class='lx-label'><span>${label}</span></div>`);
      }
      jQuery(o).find(".lx-label").css("width", widthPixel * (stay + 1));

      if (infoObject.length) {
        infoObject.map((info, key) => {
          const {name, value} = info;
          tooltips.push(`<div class='info-item'><div class='name'>${name}</div><div class='value'>${value}</div></div>`)
        });

        // Init tooltips
        if (!jQuery(o).find(".lx-tooltips").length) {
          jQuery(o).append(`<div class='lx-tooltips' style='width:${widthPixel * (stay + 1)}px'>
            <div class="lx-tooltip-inner">${tooltips.join("")}</div>
          </div>`);
        }
        jQuery(o).find(".lx-tooltips").css("width", widthPixel * (stay + 1));
      }
    });
  }

  static selectDefaultDate() {
    const month = moment().format("M");
    const year = moment().format("YYYY");
    jQuery("#lx-month-picker").val(month);
    jQuery("#lx-month-year").val(year);
  }
}

jQuery(document).ready(() => {
  const {load, formatJson, initClndr, initClndrHeader, changeCalendar, label, changeOnNav, selectDefaultDate} = Calendar;
  selectDefaultDate()
  load((calendar) => formatJson(calendar, (formatted) => {
      initClndrHeader();
      initClndr(formatted, (calendarInstance) => {
        // Init calendar label for the first time
        label();
        // Init date picker
        changeCalendar(calendarInstance, () => {
          label(); // Re init label
        });
        // Init month navigation
        changeOnNav(calendarInstance, () => {
          label(); // Reinit label
        });
        // console.log(formatted, "done!");
      });
    })
  );
});

// On resize
jQuery(window).resize(function() {
    const {label} = Calendar;
    label();
});
