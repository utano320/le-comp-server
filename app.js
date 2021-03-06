import express from "express";
import dotenv from "dotenv";
import corser from "corser";
import bodyParser from "body-parser";
import mysql from "mysql";
import dbConfig from "./config/database";
import moment from "moment";
import util from "util";

dotenv.config();
let con;

function handleConnection() {
  con = mysql.createConnection(dbConfig);
  con.query = util.promisify(con.query);

  con.connect(function(err) {
    if (err) {
      console.log(err);
      setTimeout(handleConnection, 1000);
    }

    console.log('connected to mysql');
  });

  con.on('error', err => {
    console.log(err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log(err);
      handleConnection();
    } else {
      throw err;
    }
  })
}

handleConnection();

const app = express();

app.use(corser.create());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ユーザーリスト
app.get("/users", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  let rows = await con.query("select id, name from wd_x_sf order by id");

  res.send(JSON.stringify(rows));
});

// 比較（平均2乗誤差）
app.get("/comp_rmse", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // 1人目のデータを取得
  let first = await con.query(
    "select * from wd_x_sf where id = ?",
    req.query.first
  );

  // 自分を除いたデータを取得
  let records = await con.query(
    "select * from wd_x_sf where id != ?",
    req.query.first
  );

  let rmseList = [];
  if (first.length === 1 && records.length > 0) {
    // 結果を計算
    for (let i = 0; i < records.length; i++) {
      let rmse = calcRmse(first[0], records[i]);
      if (rmse[1] !== -1) rmseList.push(rmse);
    }

    rmseList.sort((a, b) => {
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });
  }

  res.send(JSON.stringify({ rmseList: rmseList }));
});

function calcRmse(first, second) {
  let result = -1;
  let firstSf = [];
  let secondSf = [];

  // 資質を配列化して準備
  for (let i = 0; i < 34; i++) {
    let field = "sf_" + ("00" + (i + 1)).slice(-2);
    if (first[field] === "" || second[field] === "") break;

    firstSf[i] = first[field];
    secondSf[i] = second[field];
  }

  // 資質が2人とも34揃ってたら計算する
  if (firstSf.length === 34) {
    let e = 0;
    for (let i = 0; i < 34; i++) {
      let element = firstSf[i];
      let j = secondSf.indexOf(element);
      console.log([element, i, j]);
      e += Math.pow(i - j, 2);
    }
    result = parseFloat(Math.sqrt(e / 34).toFixed(1));
  }

  return [second["name"], result];
}

// 指定した資質の順位分布
app.get("/strength", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // 必要なパラメータ
  // name: 資質名

  let sql = "select ";
  let params = [];
  for (let i = 0; i < 34; i++) {
    // count()を作っていく
    let num = ("0" + (i + 1)).slice(-2);
    let c = "count(sf_" + num + " = ? or null) as cnt_" + num;
    if (i != 33) c += ",";
    sql += c;

    params.push(req.query.name);
  }
  sql += " from wd_x_sf";

  let result = await con.query(sql, params);
  let strengthCount = []
  Object.keys(result[0]).forEach(function(key) {
    strengthCount.push(result[0][key]);
  });
  res.send(JSON.stringify({ count: strengthCount}));
});

// process.env.LISTEN_PORT番ポートで待機
app.listen(process.env.LISTEN_PORT, () =>
  console.log("Listening on port " + process.env.LISTEN_PORT + " ...")
);
