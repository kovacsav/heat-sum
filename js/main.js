'use strict'

const firstDataSeries = 'Hőösszeg';
const secondDataSeries = 'Átlagos hőösszeg';
const chartTitleBase = 'Kummulált hőösszeg a sokéves átlaggal';
const xAxesLabelString = 'Dátum';
const yAxesLabelString = 'Foknap';


const minTemperature = [];
const maxTemperature = [];
const averageMinTemperature = [];
const averageMaxTemperature = [];
const city = "";
let chartTitle = "";

let baseTemperature = 10;
let topTemperature = 30;
let effTemp = 0;

// a kezdő és záró időpont között maximum egy év lehet, ezt állítjuk be millisecundum-ban
const maxDateRange = 365 * 24 * 60 * 60 * 1000;

const cityArray = ['Miskolc', 'Debrecen', 'Békéscsaba', 'Szeged', 'Kecskemét', 'Pécs', 'Kaposvár', 'Győr', 'Budapest'];

//html elemek kiválasztása

const baseMethodInput = document.querySelector('.base_method');
const maizeMethodInput = document.querySelector('.maize_method');
const baseTemperatureInput = document.querySelector('.input_base_temperature');
const topTemperatureRow = document.querySelector('.input_top_temperature_row');
const topTemperatureInput = document.querySelector('.input_top_temperature');
const cityInput = document.querySelector('.input_city_selector');
const selectionButton = document.querySelector('.selection_button');


// beállítjuk a tegnapi dátumot, mert ez a legutolsó időpont, amikor elkezdődhet a hőmérséklet összegzés
let yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

// ebben a tömbben lesz a lekérdezett időszak kummulált hőösszeg
// idősora
let cummulatedEffectiveTemperature = [];

// ebben a tömbben lesz a lekérdezett iőszakra vonatkozó átlagos
// kummulált hőösszeg idősora
let averageCummulatedEffectiveTemperature = [];


// időpontok kiválasztása
// ---------------------------------------------------------

// date picker - https://www.npmjs.com/package/js-datepicker

// az összegzés kezdő időpontjának kiválasztása

const start = datepicker('.input_start_date', {
    id: 1,

    formatter: (input, date, instance) => {
        const value = date.toLocaleDateString();
        input.value = value
    },
    startDay: 1,
    customDays: ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Sz'],
    customMonths: ['Január', 'Február', 'Március', 'Április', 'Május',
        'Június', 'Július', 'Augusztus', 'Szeptember',
        'Október', 'November', 'December'],
    minDate: new Date(2010, 0, 1),  // 2010. előtt nem adunk adatot
    maxDate: yesterday, // tegnapra van utoljára adat
    showAllDates: true,
    overlayPlaceholder: 'Év',
    overlayButton: "Rendben",
});

// az összegzés záró időpontjának kiválasztása

const end = datepicker('.input_end_date', {
    id: 1,
    //onSelect: instance => {
    //    endingDate = instance.dateSelected;
    //    console.log(endingDate);
    //},
    formatter: (input, date, instance) => {
        const value = date.toLocaleDateString();
        input.value = value
    },
    startDay: 1,
    customDays: ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Sz'],
    customMonths: ['Január', 'Február', 'Március', 'Április', 'Május',
        'Június', 'Július', 'Augusztus', 'Szeptember',
        'Október', 'November', 'December'],
    //minDate: start_day,  // nem lehet korábbi a záró időpont a kezdőnél, de ez automatikusan be van állítva
    maxDate: yesterday, // tegnapra van utoljára adat
    showAllDates: true,
    overlayPlaceholder: 'Év',
    overlayButton: "Rendben",
});

// dátum validálás
// --------------------------------------------------------

// ha nem létezik a dátum object vagy nem dátum a formátuma, akkor hibaüzenetet ad
const validateDate = () => {
    if ((typeof (start.getRange().start) == "undefined") || !(start.getRange().start.constructor.toString().indexOf("Date") > -1)) {
        alert("Kérem válasszon kezdő időpontot!");
        return false;
    }
    else {
        if ((typeof (start.getRange().end) == "undefined") || !(start.getRange().end.constructor.toString().indexOf("Date") > -1)) {
            alert("Kérem válasszon záró időpontot!");
            return false;
        }
        else {
            return true;
        };
    };
};


// ha egy évnél hosszabb a számítási időszak, akkor hibaüzenetet ad
const validateDateRange = () => {
    const startingDate = start.getRange().start;
    const endingDate = start.getRange().end;
    if ((startingDate > endingDate) || (endingDate.getTime() - startingDate.getTime() > maxDateRange)) {
        alert("A kiválasztott időszak túl hosszú, mert csak egy vegetációs időszakra számolunk hőösszeget. Kérem javítsa a kezdő vagy a záró időpontot!")
        return false;
    }
    else {
        return true;
    };
};

// számítási módszer választása
// ha az alap van kiválasztva, akkor a selectBaseMethod = true,
// az alap módszerrel számolunk és leszedjük a top temperature sort, 
// ha nem ez van, akkor false és a kukoricás módszerrel számolunk

let selectBaseMethod = false;

baseMethodInput.addEventListener('click', () => {
    selectBaseMethod = true, // baseMethodInput.checked,
    topTemperatureRow.classList.add('disabled_class');
});

maizeMethodInput.addEventListener('click', () => {
    selectBaseMethod = false, // baseMethodInput.checked,
    topTemperatureRow.classList.remove('disabled_class');
});

/*
if (selectBaseMethod == true) {
    topTemperatureRow.classList.add('disabled_class');
}
else {
    topTemperatureRow.classList.remove('disabled_class');
};
*/

//console.log(baseMethodInput.checked);

// bázis- és tophőmérséklet beállítás és validálás
// --------------------------------------------------------

// a bázis- és a tophőmérséklet beállítása
const getExtremeTemperature = () => {
    baseTemperature = parseInt(baseTemperatureInput.value);
    topTemperature = parseInt(topTemperatureInput.value);
};


// a bázis- és a tophőmérséklet vaidálása
const validateTemperature = (base, top) => {
    if ((isNaN(base) || base < 0 || base > 20) || (isNaN(top) || top < 0 || top > 40)) {
        alert("A bázishőmérsékletnek 0 és 20, a maximális hőmérsékletnek pedig 0 és 40 Celsius fok közé kell esnie.");
        return false;
    }
    else {
        return true;
    };
};

// település választás

// innen szúrjuk be a legördülő lista elemeit

cityArray.forEach(item => {
    let optionTemplate = `<option class="option" value="${item}">${item}</option>`;
    document.querySelector('.option:last-child').insertAdjacentHTML("afterend", optionTemplate);
});

// a település validálása
// annyit kell vizsgálni, hogy van-e kiválasztva elem

const validateCity = () => {
    if (cityInput.value == "") {
        alert("Kérem válasszon települést!");
        return false;
    }
    else {
        return true;
    }
};

// a validálásokat egy függvénybe szervezzük

const validateInputData = () => {
    if (validateDate()) {       // a dátumok validálása
        //console.log("Dates are OK");

        if (validateDateRange()) {  // az időszak hossza nem lehet több, mint egy vegetációs időszak
            //console.log("Date range is OK");

            getExtremeTemperature();

            if (validateTemperature(baseTemperature, topTemperature)) {
                //console.log("Extreme temperature is OK");

                if (validateCity()) {
                    //console.log("City is OK")
                    return true
                }
            };
        };
    };
};


// effektív hőmérséklet számítása
// --------------------------------------------------------

// kérdezett és átlagos min- és maxhőmérséklet generálása az
// időszak hosszának megfelelően, mivel nincs valós adatunk,
// amit ábrázolhatnánk

const createTemperatureTimeSeries = (dateRangeObject) => {

    // először kinullázzuk, hogy új időszak indításakor ne legyen
    // meg az előző tömb

    minTemperature.length = 0;
    maxTemperature.length = 0;
    averageMinTemperature.length = 0;
    averageMaxTemperature.length = 0;

    const days = (dateRangeObject.end - dateRangeObject.start) / (24 * 60 * 60 * 1000) + 1;   // millisecundumban számolja és +1 mert a végidőpont is beleszámít

    for (let i = 0; i < days; i++) {
        minTemperature[i] = 30 * Math.random() - 5; // -5 és +25 Celsius közé essen
        maxTemperature[i] = 30 * Math.random() + 5  // +5 és +35 Celsius közé essen
        averageMinTemperature[i] = 30 * Math.random() - 5; // -5 és +25 Celsius közé essen
        averageMaxTemperature[i] = 30 * Math.random() + 5  // +5 és +35 Celsius közé essen
    };
    //console.log(days, minTemperature, maxTemperature, baseTemperature, topTemperature);
};



// napi effektív hőmérséklet számítása két módszerrel
const dailyEffectiveTemperature = (minTemperature, maxTemperature) => {

    if (selectBaseMethod == true) {
        // az alap módszer
        effTemp = (minTemperature + maxTemperature) / 2 - baseTemperature;
    }
    else {
        // a kukoricás módszer
        if (minTemperature < baseTemperature) {
            minTemperature = baseTemperature;
        };

        if (maxTemperature > topTemperature) {
            maxTemperature = topTemperature;
        };

        effTemp = (minTemperature + maxTemperature) / 2 - baseTemperature;
    };

    if (effTemp < 0) {
        return 0;
    }
    else return effTemp;
};

// a grafikon számára elkészítjük a data tömböt
// x: dátum, y: hőösszeg - formátumban minden napra

const effectiveTemperatureCalculator = (dateRangeObject, minTemperature, maxTemperature, cummulatedArray) => {
    const startingDate = dateRangeObject.start;

    // a kezdőérték megadása
    const firstDay = startingDate;
    cummulatedArray[0] = {
        x: firstDay.toISOString(),  // ebben a formátumban eszi meg a luxon
        // egy tizedesre kerekítjük
        y: Math.round(dailyEffectiveTemperature(minTemperature[0], maxTemperature[0]) * 10) / 10,
    };
    // összegzett effektív hőmérséklet tömb számítása
    for (let i = 1; i < minTemperature.length; i++) {
        let nextDay = new Date();
        nextDay.setTime(firstDay.getTime() + i * 24 * 60 * 60 * 1000);
        cummulatedArray.push({
            x: nextDay.toISOString(),//.setLocale('hu'),   // ebben a formátumban eszi meg a luxon
            y: Math.round((cummulatedArray[i - 1].y + dailyEffectiveTemperature(minTemperature[i], maxTemperature[i])) * 10) / 10
        });
    };
};


// előállítjuk az átlagos és az aktuális kummulált hőösszeg tömböket

const getCummulatedEffectiveTemperature = () => {

    averageCummulatedEffectiveTemperature.length = 0;   // először kinullázzuk
    effectiveTemperatureCalculator(start.getRange(), averageMinTemperature, averageMaxTemperature, averageCummulatedEffectiveTemperature);

    cummulatedEffectiveTemperature.length = 0;; // először kinullázzuk
    effectiveTemperatureCalculator(start.getRange(), minTemperature, maxTemperature, cummulatedEffectiveTemperature);
};


// grafikon rajzolása
// --------------------------------------------------------

// ez lesz a chart divje, amit majd innen szúrunk be
// saját legendet adunk meg, mert a gyári nem formázható elég jól

const template = `
    <div class="chart_container">

        <canvas class="degree_day_chart"></canvas>

        <div class="legend_container">
            <div class="first_data_series">
                <svg width="60" height="20">
                    <path d="M 10 15 h 40" stroke="rgb(255, 54, 44)" stroke-width="4" />
                </svg>
                <span>${firstDataSeries}</span>
            </div>

            <div class="second_data_series">
                <svg width="60" height="20">
                    <path d="M 10 15 h 40" stroke="rgb(100, 100, 200)" stroke-width="4" />
                </svg>
                <span>${secondDataSeries}</span>
            </div>
        </div>
        
    </div>
`;

// az első gombra kattintásnál szúrjuk be a chart divjét,
// a többinél már nem kell
const isFirstClick = () => {
    if (!document.querySelector('.chart_container')) {
        // beszúrjuk a chart és a saját legend divjét
        document.querySelector('form').insertAdjacentHTML("afterend", template);
        //console.log('chart is not on')
    }
};

// a chart frissítése az új rajzolása előtt
const updateChart = () => {
    if (document.querySelector('.chart_container')) {
        // töröljük a korábbi chart egész divjét, ha már volt ilyen
        document.querySelector('.chart_container').remove();
        //console.log('chart is exist')
    }
    // beszúrjuk a chart és a saját legend divjét
    document.querySelector('form').insertAdjacentHTML("afterend", template);
};

const setChartTitle = () => {
    chartTitle = chartTitleBase + " - " +
        cityInput.value + " - " +
        start.getRange().start.toLocaleDateString() + " - " +
        start.getRange().end.toLocaleDateString();
};

//  chartjs.org
// https://github.com/chartjs/Chart.js
// ez a legújabb, 3.x (master) verzió, saját buildeléssel
// dokumentáció: https://www.chartjs.org/docs/master/
// ez már tudja a két görbe közti területet külön színezni

// a time kezelésére a Luxon adaptert használjuk
// https://moment.github.io/luxon/


const drawChart = () => {

    //const DateTime = luxon.DateTime;
    //DateTime.setLocale('hu');
    luxon.Settings.defaultLocale = "hu";

    // a chart frissítése, hogy tiszta lappal induljon
    updateChart();

    const ctx = document.querySelector('.degree_day_chart');

    const myChart = new Chart(ctx, {

        type: 'line',

        data: {
            datasets: [
                {
                    label: firstDataSeries,

                    fill: {      // ez a lehetőség csak a 3.x verziótól elérhető
                        // a két görbe közti területet külön színnel lehet kitölteni
                        target: 1,
                        above: 'rgba(255, 134, 66, 0.2)',   // Area will be red above the origin
                        below: 'rgba(0, 130, 255, 0.2)'    // And blue below the origin
                    },

                    borderColor: 'rgb(255, 54, 44)',
                    borderWidth: 4,
                    data: cummulatedEffectiveTemperature
                },

                {
                    label: secondDataSeries,
                    borderColor: 'rgb(100, 100, 200)',
                    borderWidth: 4,
                    data: averageCummulatedEffectiveTemperature
                }
            ]
        },

        options: {

            responsive: true,

            datasets: {
                line: {
                    pointRadius: 1,
                }
            },

            pointHoverRadius: 7,
            pointHoverBackgroundColor: 'rgb(0, 0, 0)',
            pointHoverBorderColor: 'rgb(0, 0, 0)',

            interaction: {
                mode: 'nearest'
            },

            plugins: {
                title: {
                    display: true,
                    color: 'rgb(0, 0, 0)',
                    text: chartTitle,
                    font: {
                        size: 22
                    },
                    padding: 20,
                },

                legend: {
                    display: false
                },

                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: 'rgba(30, 30, 30, 0.8)',
                    bodyFont: {
                        size: 15
                    },
                    bodySpacing: 4,
                    titleFont: {
                        size: 15,
                    },
                    Padding: 20,
                    caretPadding: 10,
                    caretSize: 5,
                },
            },

            scales: {
                x: {
                    type: "time",
                    time: {
                        displayFormats: {
                            day: 'LLL d.'
                        },
                        tooltipFormat: 'yyyy. LLL d.',
                        minUnit: 'day'
                    },
                    title: {
                        display: true,
                        text: xAxesLabelString,
                        color: 'rgb(0, 0, 0)',
                        font: {
                            size: 15
                        },
                        padding: 10,
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yAxesLabelString,
                        color: 'rgb(0, 0, 0)',
                        font: {
                            size: 15
                        },
                    }
                }
            }
        }
    });

};


// a gombra kattintva indul a buli

selectionButton.addEventListener("click", (ev) => {

    ev.preventDefault();        // kizárjuk az oldalfrissítést
    if (validateInputData()) {  // ha minden bemenő adat OK, akkor
        createTemperatureTimeSeries(start.getRange());
        getCummulatedEffectiveTemperature();
        setChartTitle();
        drawChart();
    }
});