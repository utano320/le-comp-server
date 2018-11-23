import express from "express";
import dotenv from "dotenv";
import corser from "corser";
import bodyParser from "body-parser";
import mysql from "mysql";
import dbConfig from "./config/database";
import moment from "moment";
import util from "util";

dotenv.config();
const con = mysql.createConnection(dbConfig);
con.query = util.promisify(con.query);

con.connect(err => {
  if (err) throw err;

  console.log("connected to mysql");
});

const app = express();

app.use(corser.create());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/users", async (req, res) => {
  let rows = await con.query("select id, name from wd_x_sf");

  res.send(JSON.stringify(rows));
});

// process.env.LISTEN_PORT番ポートで待機
app.listen(process.env.LISTEN_PORT, () =>
  console.log("Listening on port " + process.env.LISTEN_PORT + " ...")
);
