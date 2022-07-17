![Boomerang Logo](src/assets/Boomerang%20Marquee.png)

An easier way to switch between your most recent tabs.


## Instructions

<details>
<summary>Development Quick Start</summary>

### Prerequisites

- Node.js (tested on v18)
- NPM (tested on v8.6.0)
- Chrome (>= v88), has only been tested here

Note: Even thought the extension uses the `webextension-pollyfill` library, it has currently only been tested on Chrome. However, it should work on other browsers like Firefox, Opera, Edge, etc.

### Clone Repo

```bash
git clone https://github.com/MitchellMarkGeorge/Boomerang
```

### Install Dependencies

```bash
npm install
```

### Start Dev Build

```bash
npm start
```

Note: For minified production build, use `npm run build` instead.

### Add To Chrome

- Open `chrome://extensions`
- Enable Development mode
- Click Load Unpacked button
- Navigate to repository
- Select `dist` directory

</details>
<details>
<summary>
Usage
</summary>

To switch beween your previous and current tab, use the `ctrl` + `shift` + `left arrow` shortcut.

That's it. That's how simple it is.

Note: For Mac, `cmd` is used instead of `ctrl`.

</details>

## Built With
- TypeScript (for the background script)

## Versioning

We use [SemVer](http://semver.org/) for versioning.

## Authors

- **Mitchell Mark-George** - _Initial work_

See also the list of [contributors](https://github.com/MitchellMarkGeorge/TabButler/contributors) who participated in this project.

<!-- ## Contributing

Please read [CONTRIBUTING.md] for details on our code of conduct, and the process for submitting pull requests to us. -->

<!-- ## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details -->
