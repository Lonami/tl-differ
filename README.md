# Type Language Differ

## Using

You can view the online version at https://diff.telethon.dev.

You can also view this locally after compiling by
simply opening `index.html` in your web browser of choice.

## Compiling

To "compile" the site, you must run the following Python script:

```sh
python get-all-tl.py
```

This will clone or update the [`tdesktop`] repository, checkout each revision
that affects `scheme.tl` files, and then analyze them to generate a "compact"
`diff.js` difference. None of these files are included in the repository to
greatly reduce bloat.

## Structure

### `index.html`

This is the front-end, and is just the skeleton and outfit of the application.

### `app.js`

This has the logic to calculate the difference between any two layers, working
with their deltas, and updating the frontend.

[`tdesktop`]: https://github.com/telegramdesktop/tdesktop
