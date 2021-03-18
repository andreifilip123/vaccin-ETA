import fetch from 'node-fetch';
import ExcelCSV from 'excelcsv';

import { downloadFile, setValueDeep } from './utils.mjs'

const getSpreadsheetUrl = async () => {
    const spreadsheetUrlRaw = await fetch('https://data.gov.ro/api/3/action/package_show?id=transparenta-covid')
    const spreadsheetUrlObject = await spreadsheetUrlRaw.json();
    const spreadsheetUrl = spreadsheetUrlObject.result.resources[1].datagovro_download_url;
    return spreadsheetUrl;
}


const main = async () => {
    const spreadsheetUrl = await getSpreadsheetUrl();
    await downloadFile(spreadsheetUrl, 'latest.xlsx');
    const parser = new ExcelCSV('latest.xlsx', 'latest.csv');
    const csv = parser
        .row(function (row, worksheet) {
            if (row.every(element => !element)) {
                return false;
            }
            return row;
        })
        .init();
    const rows = csv.split('\n');
    rows.shift();
    const parsedRows = rows.map(row => {
        const [judet, localitate, numeCentru, dataVaccinare, produs, dozeAdministrate, doza1, doza2, grupaDeRisc] = row
            .split(',')
            .map(item => item.replace(/['"]+/g, ''))
        return {
            judet,
            localitate,
            numeCentru,
            dataVaccinare,
            produs,
            dozeAdministrate,
            doza1,
            doza2,
            grupaDeRisc
        };
    })
    const judeteAcc = parsedRows.reduce((acc, curr) => {
        let numeCentruPath = `${curr.judet}§${curr.localitate}§${curr.numeCentru}`;
        setValueDeep(acc, `${numeCentruPath}§produs`, curr.produs);
        setValueDeep(acc, `${numeCentruPath}§dozeAdministrate§${curr.dataVaccinare}`, parseInt(curr.dozeAdministrate));
        return acc;
    }, {});
    const medianCalculator = array => {
        const sum = array.reduce((acc, curr) => {
            return acc + curr
        }, 0);
        return  sum/array.length;
    }
    debugger

    const getAvgVaccinationRate = (judet, localitate, numeCentru) => {
        const centru = judeteAcc[judet][localitate][numeCentru]
        const dates = Object.values(centru.dozeAdministrate)
        return medianCalculator(dates)
    }
    console.log(getAvgVaccinationRate('Braila', 'Braila', 'Centru_S_Sala de sport a Scolii Gimnaziale nr. 23 Mihai Eminescu'))
}
main();
