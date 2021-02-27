const select_from = document.getElementById('select_from');
const select_to = document.getElementById('select_to');
const div_diff = document.getElementById('div_diff');
const stats = document.getElementById('stats');

const added_types = document.getElementById('added_types');
const added_functions = document.getElementById('added_functions');
const removed_types = document.getElementById('removed_types');
const removed_functions = document.getElementById('removed_functions');
const changed_types = document.getElementById('changed_types');
const changed_functions = document.getElementById('changed_functions');

const added_div = document.getElementById('added_div');
const removed_div = document.getElementById('removed_div');
const changed_div = document.getElementById('changed_div');
const added_types_div = document.getElementById('added_types_div');
const added_functions_div = document.getElementById('added_functions_div');
const removed_types_div = document.getElementById('removed_types_div');
const removed_functions_div = document.getElementById('removed_functions_div');
const changed_types_div = document.getElementById('changed_types_div');
const changed_functions_div = document.getElementById('changed_functions_div');

const collapsed_diff = [];
for (const layer of DIFF) {
    const cdl = collapsed_diff.length;
    if (cdl === 0
            || collapsed_diff[cdl - 1].layer === null
            || collapsed_diff[cdl - 1].layer !== layer.layer) {
        collapsed_diff.push(layer); // first or different
    } else {
        collapsed_diff[cdl - 1] = layer; // replace same layer (keep latest)
    }
}

let used_diff = collapsed_diff;

const get_url_query_param = param =>
    (
        (window.location.href.split("?")[1] || "")
            .split("&")
            .map(part => part.split("="))
            .find(kv => kv[0] == param) || []
    )[1] || null;

function change_used_diff(event) {
    used_diff = event.target.checked ? collapsed_diff : DIFF;
    fill_select_boxes();
    load_diff();
}

function layer_name(layer) {
    const name = layer.layer == null ? 'Unknown layer' : `Layer ${layer.layer}`;
    const date = new Date(layer.date * 1000);
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `[${year}-${month}-${day}] ${name}`;
}

function toggle_expand(event) {
    const div = event.target.parentElement.parentElement;
    const tags = div.getElementsByTagName('details');

    // open all if any is closed, close all only if all are open
    let any_closed = false;
    for (const details of tags) {
        if (!details.open) {
            any_closed = true;
            break;
        }
    }

    for (const details of tags) {
        details.open = any_closed;
    }
}

function fill_select_boxes(from_layer, to_layer) {
    let from = null;
    let to = null;
    from_layer = parseInt(from_layer);
    to_layer = parseInt(to_layer);

    empty_node(select_from);
    empty_node(select_to);
    for (let i = 0; i < used_diff.length; ++i) {
        const layer = used_diff[i];
        if (i !== used_diff.length - 1) {
            const option = document.createElement('option');
            option.value = i;
            option.innerText = layer_name(layer);
            select_from.appendChild(option);
        }
        if (i !== 0) {
            const option = document.createElement('option');
            option.value = i;
            option.innerText = layer_name(layer);
            select_to.appendChild(option);
        }
        if (from === null && from_layer == layer.layer) {
            from = i;
        }
        if (to === null && to_layer == layer.layer) {
            to = i - 1;
        }
    }

    select_from.selectedIndex = from || used_diff.length - 2;
    select_to.selectedIndex = to || used_diff.length - 2;
}

function change_select_from() {
    if (select_from.selectedIndex > select_to.selectedIndex) {
        select_from.selectedIndex = select_to.selectedIndex;
    }
}

function change_select_to() {
    if (select_to.selectedIndex < select_from.selectedIndex) {
        select_to.selectedIndex = select_from.selectedIndex;
    }
}

function empty_node(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function empty_diff_lists() {
    empty_node(added_types);
    empty_node(added_functions);
    empty_node(removed_types);
    empty_node(removed_functions);
    empty_node(changed_types);
    empty_node(changed_functions);
}

function append_li(ul, ...args) {
    for (const arg of args) {
        const li = document.createElement('li');
        if (typeof arg === 'string') {
            li.appendChild(document.createTextNode(arg))
        } else if (arg instanceof Element) {
            li.appendChild(arg);
        } else {
            const span = document.createElement('span');
            span.className = arg.class;
            span.appendChild(document.createTextNode(arg.value));
            li.appendChild(span);
        }
        ul.appendChild(li);
    }
}

function append_li_migrate(ul, from, to, name) {
    const li = document.createElement('li');
    if (name !== undefined) {
        li.appendChild(document.createTextNode(`${name} `));
    }
    {
        const span = document.createElement('span');
        span.className = 'old';
        span.appendChild(document.createTextNode(from));
        li.appendChild(span);
    }
    li.appendChild(document.createTextNode(' → '));
    {
        const span = document.createElement('span');
        span.className = 'new';
        span.appendChild(document.createTextNode(to));
        li.appendChild(span);
    }
    ul.appendChild(li);
}

function extend_list(list, items) {
    sorted_items = [];
    for (const [name, item] of Object.entries(items)) {
        sorted_items.push(item);
    }
    sorted_items.sort((a, b) => a.name.localeCompare(b.name));

    for (item of sorted_items) {
        const summary = document.createElement('summary');
        summary.appendChild(document.createTextNode(item.name));

        const details = document.createElement('details');
        details.appendChild(summary);

        const ul = document.createElement('ul');
        if (item.id !== null) {
            append_li(ul, `#${('00000000' + item.id.toString(16)).slice(-8)}`);
        }
        for (arg of item.fields) {
            append_li(ul, `${arg.name}:${arg.type}`);
        }
        {
            append_li(`= ${item.type}`);
        }
        details.appendChild(ul);

        const li = document.createElement('li');
        li.appendChild(details);
        list.appendChild(li);
    }
}

function extend_change_list(list, items) {
    sorted_items = [];
    for (const [name, item] of Object.entries(items)) {
        sorted_items.push(item);
    }
    sorted_items.sort((a, b) => a.after.name.localeCompare(b.after.name));

    for (item of sorted_items) {
        const summary = document.createElement('summary');
        summary.appendChild(document.createTextNode(item.after.name));

        const details = document.createElement('details');
        details.appendChild(summary);

        const ul = document.createElement('ul');
        if (item.before.id !== item.after.id) { // neither null nor the same
            if (item.before.id === null) {
                append_li(ul, {
                    class: 'new',
                    value: `#${('00000000' + item.after.id.toString(16)).slice(-8)}`
                });
            } else if (typeof item.after.id === null) {
                append_li(ul, {
                    class: 'old',
                    value: `#${('00000000' + item.before.id.toString(16)).slice(-8)}`
                });
            } else {
                append_li_migrate(
                    ul,
                    `#${('00000000' + item.before.id.toString(16)).slice(-8)}`,
                    `#${('00000000' + item.after.id.toString(16)).slice(-8)}`
                );
            }
        }

        // fields are a list because their order matters, so that's why
        // it's not a map already. we however work better with maps here.
        old_args = {};
        for (arg of item.before.fields) {
            old_args[arg.name] = arg;
        }
        new_args = {};
        for (arg of item.after.fields) {
            new_args[arg.name] = arg;
        }

        // figure out changed items
        for (arg of item.before.fields) {
            const current = new_args[arg.name];
            if (typeof current !== 'undefined' && arg.type !== current.type) {
                append_li_migrate(ul, arg.type, current.type, arg.name);
            }
        }

        // figure out removed items
        for (arg of item.before.fields) {
            if (!new_args.hasOwnProperty(arg.name)) {
                append_li(ul, {class: 'old', value: `${arg.name}:${arg.type}`});
            }
        }

        // figure out new items
        for (arg of item.after.fields) {
            if (!old_args.hasOwnProperty(arg.name)) {
                append_li(ul, {class: 'new', value: `${arg.name}:${arg.type}`});
            }
        }

        details.appendChild(ul);

        const li = document.createElement('li');
        li.appendChild(details);
        list.appendChild(li);
    }
}

function update_added(from, to, kind) {
    for (item of from.added[kind]) {
        if (item.name in to.removed[kind]) {
            // if it was removed and then added again, it was changed (probably)
            const before = to.removed[kind][item.name];
            if (item.id !== before.id) {
                to.changed[kind][item.name] = {
                    before: before,
                    after: item
                };
            }
        } else {
            // if it was only added, it was added
            to.added[kind][item.name] = item;
        }
        // in any case, it was removed from removed
        delete to.removed[kind][item.name];
    }
}

function update_removed(from, to, kind) {
    for (item of from.removed[kind]) {
        // in any case, it is added to removed, and removed from both added and changed
        to.removed[kind][item.name] = item;
        delete to.added[kind][item.name];
        delete to.changed[kind][item.name];
    }
}

function update_changed(from, to, kind) {
    for (item of from.changed[kind]) {
        if (item.after.name in to.added[kind]) {
            // if something was added and then changes, it was still newly added
        } else {
            to.changed[kind][item.after.name] = item;
        }
    }
}

function set_visible_ty_fn(main, ty, fn, where) {
    const ty_count = Object.keys(where.types).length;
    const fn_count = Object.keys(where.functions).length;
    if (ty_count === 0 && fn_count === 0) {
        main.style.display = 'none';
    } else {
        main.style.display = '';
        ty.style.display = ty_count === 0 ? 'none' : '';
        fn.style.display = fn_count === 0 ? 'none' : '';
    }
}

function set_td_text(tr, index, object) {
    tr.children[index].replaceChild(
        document.createTextNode(Object.keys(object).length.toString()),
        tr.children[index].lastChild
    )
}

function fill_stats(diff) {
    const tbody = stats.children[1];
    const ty = tbody.children[0];
    const fn = tbody.children[1];

    set_td_text(ty, 1, diff.added.types);
    set_td_text(fn, 1, diff.added.functions);
    set_td_text(ty, 2, diff.removed.types);
    set_td_text(fn, 2, diff.removed.functions);
    set_td_text(ty, 3, diff.changed.types);
    set_td_text(fn, 3, diff.changed.functions);
}

function load_diff() {
    div_diff.style.display = 'none';

    let from_idx = Number(select_from.value);
    let to_idx = Number(select_to.value);
    if (used_diff == collapsed_diff) {
        // figure out indices in the original diff with all data
        let needle = used_diff[from_idx];
        for (let i = from_idx; i < DIFF.length; ++i) {
            if (needle == DIFF[i]) {
                from_idx = i;
                break;
            }
        }
        needle = used_diff[to_idx];
        for (let i = to_idx; i < DIFF.length; ++i) {
            if (needle == DIFF[i]) {
                to_idx = i;
                break;
            }
        }
    }
    const diff = {
        added: {types: {}, functions: {}},
        removed: {types: {}, functions: {}},
        changed: {types: {}, functions: {}}
    };
    for (let i = from_idx + 1; i <= to_idx; ++i) {
        const layer = DIFF[i];
        update_added(layer, diff, 'types');
        update_added(layer, diff, 'functions');
        update_removed(layer, diff, 'types');
        update_removed(layer, diff, 'functions');
        update_changed(layer, diff, 'types');
        update_changed(layer, diff, 'functions');
    }

    empty_diff_lists();
    extend_list(added_types, diff.added.types);
    extend_list(added_functions, diff.added.functions);
    extend_list(removed_types, diff.removed.types);
    extend_list(removed_functions, diff.removed.functions);
    extend_change_list(changed_types, diff.changed.types);
    extend_change_list(changed_functions, diff.changed.functions);

    // default to showing everything, hide as needed
    set_visible_ty_fn(added_div, added_types_div, added_functions_div, diff.added);
    set_visible_ty_fn(removed_div, removed_types_div, removed_functions_div, diff.removed);
    set_visible_ty_fn(changed_div, changed_types_div, changed_functions_div, diff.changed);

    fill_stats(diff);
    div_diff.style.display = '';
}

div_diff.style.display = 'none';
select_from.addEventListener('change', load_diff);
select_to.addEventListener('change', load_diff);

fill_select_boxes(get_url_query_param('from'), get_url_query_param('to'));
load_diff();
