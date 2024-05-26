const { ipcMain, dialog } = require("electron");
const robot = require("robotjs");

ipcMain.on("mouse-move", (e, arg) => {
  const { m, n } = arg;
  robot.moveMouse(m, n);
});
ipcMain.on("mouse-toggle", (e, obj) => {
  let direction = "left";
  switch (obj.direction) {
    case 1:
      direction = "left";
      break;
    case 2:
      direction = "middle";
      break;
    case 3:
      direction = "right";
      break;
    default:
      break;
  }

  robot.mouseToggle(obj.upOrDown, direction);
});
ipcMain.on("mouse-dblclick", (e, obj) => {
  robot.mouseClick("left", true);
});
ipcMain.on("mouse-wheel", (e, obj) => {
  const { deltaX, deltaY } = obj;
  console.log({ deltaX, deltaY }, "ipcmain");
  robot.scrollMouse(deltaX, deltaY);
});
ipcMain.on("type", (e, obj) => {
  let key = obj.key;

  if (key.includes("Arrow")) {
    key = key.slice(5).toLowerCase();
  }

  console.log(key);
  try {
    if (obj.modifier && obj.modifier.length > 0) {
      robot.keyTap(key, obj.modifier);
    } else {
      robot.keyTap(key.toLowerCase());
    }
  } catch (err) {
    dialog
      .showMessageBox({
        title: "Error",
        message: `${err}`,
        type: "error",
      })
      .then((res) => {
        console.log(res);
      });
  }
});
