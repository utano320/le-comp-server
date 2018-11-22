import express from "express";

const app = express();

app.get("/users", (req, res) => {
  let sampleData = [
    {
      id: 1,
      name: "うたの"
    },
    {
      id: 2,
      name: "su"
    }
  ];

  res.send(JSON.stringify(sampleData));
});

// 8888番ポートで待機
app.listen(8888, () => console.log("Listening on port 8888 ..."));
