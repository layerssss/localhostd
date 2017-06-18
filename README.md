# bnb

Run and serve your web apps in .dev domains on your develop machine.

![a](https://user-images.githubusercontent.com/1559832/27260786-ccb150de-5488-11e7-9cb5-44b98d5fdad2.gif)

This project is inspired by:

* [37 Signals' Pow](http://pow.cx/) (Rack, OS X only)
* [typicode/hotel](https://github.com/typicode/hotel)

Comparing to hotel, this project comes with a few extra features:

* Full-fledged / operable terminal (powered by battle-hardened [node-pty](https://github.com/Tyriar/node-pty) and [xterm.js](https://github.com/sourcelair/xterm.js/))
* Also shipped as an Electron / GUI app (available on Linux / OS X / Windows)
* Robust state control (easily and reliably restarting app when needed)
* Proxy all network request (so you don't have to setup proxy auto-config, just use the single proxy, makes it easy for cross-projects API invocation)
* Self-signed SSL connection (with correct SAN so it produces a 'greenlock' after marking CA trusted manually)

## Install

If you prefer launching and keeping it by CLI, then

```
npm install bnb -g
bnb server 
```

... or if you prefer launching it as a GUI staying as a tray icon, [download the latest release](https://github.com/layerssss/bnb/releases).


## Usage

Configure your brower to use `http://localhost:2999` as HTTP/HTTPS proxy. Then add your apps in http://bnb.dev/ (or in GUI), specifying the directory and the command to run your application.

Make sure they listen to the HTTP port number specified in the `PORT` enviroment variable. Here are some examples commands:

* `ember server`
* `jekyll server`
* `rails server --port $PORT`
* `python -m SimpleHTTPServer $PORT`
* `php -S 127.0.0.1:$PORT`

Then click the 🌎 button in the app details to go to its `.dev` domain. `bnb` will launch your app for you.

## Self-signed SSL

`bnb` generates a self-signed CA key-pair and stores it with other data at `~/.bnb.json`. Then it signs SSL certificate for each `.dev` domain when requested. So SSL works out of box, just by going to `https://my-app.dev/`. But if want to see a 'greenlock', i.e. to make your browser trust `bnb`, you need to mark your self-signed CA as trusted in browser or OS.

## License

[MIT - Michael Yin](LICENSE)
