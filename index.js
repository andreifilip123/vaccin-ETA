import fetch from "node-fetch";
import ExcelCSV from "excelcsv";
import inquirer from "inquirer";
import inquirerAutocompletePrompt from "inquirer-autocomplete-prompt";
import fuzzy from "fuzzy";
import fs from "fs";

import { downloadFile, setValueDeep } from "./utils.mjs";

const getSpreadsheetUrl = async () => {
  const spreadsheetUrlRaw = await fetch(
    "https://data.gov.ro/api/3/action/package_show?id=transparenta-covid"
  );
  const spreadsheetUrlObject = await spreadsheetUrlRaw.json();
  const spreadsheetUrl =
    spreadsheetUrlObject.result.resources[1].datagovro_download_url;
  return spreadsheetUrl;
};

const main = async () => {
  const spreadsheetUrl = await getSpreadsheetUrl();
  let csv;
  if (!fs.existsSync("latest.xlsx")) {
    await downloadFile(spreadsheetUrl, "latest.xlsx");
    const parser = new ExcelCSV("latest.xlsx", "latest.csv");
    csv = parser
      .row(function (row, worksheet) {
        if (row.every((element) => !element)) {
          return false;
        }
        return row;
      })
      .init();
  } else {
    const data = fs.readFileSync("./latest.csv", "utf8");
    csv = data;
  }
  const rows = csv.split("\n");
  rows.shift();
  const parsedRows = rows.map((row) => {
    const [
      judet,
      localitate,
      numeCentru,
      dataVaccinare,
      produs,
      dozeAdministrate,
      doza1,
      doza2,
      grupaDeRisc,
    ] = row.split(",").map((item) => item.replace(/['"]+/g, ""));
    return {
      judet,
      localitate,
      numeCentru,
      dataVaccinare,
      produs,
      dozeAdministrate,
      doza1,
      doza2,
      grupaDeRisc,
    };
  });
  const judeteAcc = parsedRows.reduce((acc, curr) => {
    let numeCentruPath = `${curr.judet}§${curr.localitate}§${curr.numeCentru}`;
    setValueDeep(acc, `${numeCentruPath}§produs`, curr.produs);
    setValueDeep(
      acc,
      `${numeCentruPath}§dozeAdministrate§${curr.dataVaccinare}`,
      parseInt(curr.dozeAdministrate)
    );
    return acc;
  }, {});
  const medianCalculator = (array) => {
    const sum = array.reduce((acc, curr) => {
      return acc + curr;
    }, 0);
    return sum / array.length;
  };

  const getAvgVaccinationRate = (judet, localitate, numeCentru) => {
    const centru = judeteAcc[judet][localitate][numeCentru];
    const dates = Object.values(centru.dozeAdministrate);
    return medianCalculator(dates);
  };

  inquirer.registerPrompt("autocomplete", inquirerAutocompletePrompt);
  const judet = await inquirer
    .prompt([
      {
        type: "autocomplete",
        name: "judet",
        message: "Din ce judet esti ?",
        emptyText: "Judetul nu a fost gasit!",
        pageSize: 5,
        source: (answers, input) => {
          input = input || "";
          return new Promise(function (resolve) {
            setTimeout(function () {
              var fuzzyResult = fuzzy.filter(input, Object.keys(judeteAcc));
              const results = fuzzyResult.map(function (el) {
                return el.original;
              });

              results.splice(5, 0, new inquirer.Separator());
              results.push(new inquirer.Separator());
              resolve(results);
            }, 200);
          });
        },
      },
      {
        type: "autocomplete",
        name: "localitate",
        message: "Din ce localitate esti ?",
        emptyText: "Localitatea nu a fost gasita!",
        pageSize: 5,
        source: (answers, input) => {
          input = input || "";
          return new Promise(function (resolve) {
            setTimeout(function () {
              var fuzzyResult = fuzzy.filter(
                input,
                Object.keys(judeteAcc[answers.judet])
              );
              const results = fuzzyResult.map(function (el) {
                return el.original;
              });

              results.splice(5, 0, new inquirer.Separator());
              results.push(new inquirer.Separator());
              resolve(results);
            }, 200);
          });
        },
      },
      {
        type: "autocomplete",
        name: "centru",
        message: "Cum se numeste centrul de vaccinare ?",
        emptyText: "Centrul nu a fost gasit!",
        pageSize: 5,
        source: (answers, input) => {
          input = input || "";
          return new Promise(function (resolve) {
            setTimeout(function () {
              var fuzzyResult = fuzzy.filter(
                input,
                Object.keys(judeteAcc[answers.judet][answers.localitate])
              );
              const results = fuzzyResult.map(function (el) {
                return el.original;
              });

              results.splice(5, 0, new inquirer.Separator());
              results.push(new inquirer.Separator());
              resolve(results);
            }, 200);
          });
        },
      },
    ])
    .then((answers) => {
      console.log(
        `Ai selectat: ${answers.judet}, ${answers.localitate} - ${answers.centru}`
      );
      const centru =
        judeteAcc[answers.judet][answers.localitate][answers.centru];
      console.log(
        `Media aici e de: ${medianCalculator(
          Object.values(centru.dozeAdministrate)
        )}`
      );
    });
};

try {
  main();
} catch (error) {
  console.log(error);
}
