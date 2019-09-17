import os
import re
import json
import functools
import datetime
import itertools

from pathlib import Path
from subprocess import run, PIPE

# Layers which don't specify themselves in the common place
KNOWN_LAYERS = {
    1401439999: b'15',
    1404472374: b'16',
    1414003143: b'19',
}

tl = {}  # date: file contents

tdesktop = Path('tdesktop').resolve()
schemes = Path('schemes').resolve()

if not schemes.is_dir():
    schemes.mkdir(parents=True)

def in_dir(which):
    def wrapper(function):
        @functools.wraps(function)
        def wrapped(*args, **kwargs):
            previous = Path('.').resolve()
            try:
                if not which.is_dir():
                    which.mkdir(parents=True)

                os.chdir(which)
                function(*args, **kwargs)
            finally:
                os.chdir(previous)
        return wrapped
    return wrapper


class Field:
    def __init__(self, field):
        if ':' in field:
            self.name, self.type = field.split(':')
        else:
            self.name, self.type = None, field

    def to_dict(self):
        return {'name': self.name, 'type': self.type}

    def __eq__(self, other):
        return self.name == other.name and self.type == other.type

    def __repr__(self):
        return f'{self.name}:{self.type}'

class Definition:
    def __init__(self, line, *, function):
        self.function = function

        left, right = line.split(maxsplit=1)
        if '#' in left:
            self.name, self.id = left.split('#')
            self.id = int(self.id, 16)
        else:
            self.name, self.id = left, None

        left, right = right.split('=')
        left.strip()
        self.fields = [Field(x) for x in left.split()] if left else []

        self.type = right.strip().rstrip(';').rstrip()

    def to_dict(self):
        return {
            'name': self.name,
            'id': self.id,
            'fields': [x.to_dict() for x in self.fields],
            'type': self.type
        }

    def __eq__(self, other):
        return (
            self.id == other.id 
            and self.function == other.function
            and self.name == other.name
            and self.type == other.type
            and self.fields == other.fields
        )

    def __repr__(self):
        id_part = f'#{self.id:x}' if self.id is not None else ''
        field_part = (' '.join(map(repr, self.fields)) + ' ') if self.fields else ''
        return f"{self.name}{id_part} {field_part}= {self.type};"

class Scheme:
    def __init__(self, contents='// LAYER 0'):
        self.layer = None
        self.definitions = {}

        function = False
        for m in re.finditer('.+', contents):
            line = m.group(0)
            if line == '---functions---':
                function = True
            elif line == '---types---':
                function = False
            elif not line.startswith('//') and not line.startswith('#'):
                definition = Definition(line, function=function)
                self.definitions[definition.name] = definition
            elif line.startswith('// LAYER'):
                self.layer = int(line[8:])

    def to_dict(self):
        return {
            'layer': self.layer, 
            'definitions': [x.to_dict() for x in sorted(self.definitions.items(), key=lambda t: t[0])]
        }

    def __repr__(self):
        return '\n'.join(map(repr, self.definitions.values()))

@in_dir(tdesktop)
def pull():
    if not (tdesktop / '.git').is_dir():
        run(('git', 'clone', 'git@github.com:telegramdesktop/tdesktop.git', '.'))

    run(('git', 'checkout', 'dev', '--force'))
    run(('git', 'reset', '--hard', 'HEAD'))
    run(('git', 'pull'))


@in_dir(tdesktop)
def extract():
    tl_paths = list(map(Path, (
        'Telegram/Resources/tl/api.tl',
        'Telegram/Resources/scheme.tl',
        'Telegram/SourceFiles/mtproto/scheme.tl'
    )))

    git_log = ['git', 'log', '--format=format:%H %ct', '--']
    layer_file = Path('Telegram/SourceFiles/mtproto/mtpCoreTypes.h')
    layer_re = re.compile(rb'static const mtpPrime mtpCurrentLayer = (\d+);')

    for tl_path in tl_paths:
        run(('git', 'checkout', 'dev', '--force'))
        for line in run(git_log + [tl_path], stdout=PIPE).stdout.decode().split('\n'):
            commit, date = line.split()
            date = int(date)

            run(('git', 'checkout', commit, '--force'))
            if not tl_path.is_file():
                continue  # last commit when this file was renamed

            layer = KNOWN_LAYERS.get(date)
            if layer is None and layer_file.is_file():
                with layer_file.open('rb') as fd:
                    match = layer_re.search(fd.read())
                    if match:
                        layer = match.group(1)

            with open(tl_path, 'rb') as fin, open(schemes / f'{date}.tl', 'wb') as fout:
                data = fin.read()
                if layer is not None:
                    data += b'\n// LAYER ' + layer + b'\n'
                fout.write(data)
                tl[date] = Scheme(data.decode('utf-8'))

def load_tl():
    for tl_path in schemes.glob('*.tl'):
        with tl_path.open(encoding='utf-8') as fd:
            tl[int(tl_path.stem)] = Scheme(fd.read())

def gen_index():
    deltas = []
    previous = Scheme()
    for date, current in sorted(tl.items(), key=lambda t: t[0]):
        added = ([], [])
        removed = ([], [])
        changed = ([], [])

        old = set(previous.definitions)
        new = set(current.definitions)

        for item in (new - old):
            item = current.definitions[item]
            added[item.function].append(item.to_dict())

        for item in (old - new):
            item = previous.definitions[item]
            removed[item.function].append(item.to_dict())

        for item in (old & new):
            before = previous.definitions[item]
            after = current.definitions[item]
            if before != after:
                assert before.function == after.function
                changed[after.function].append({
                    'before': before.to_dict(),
                    'after': after.to_dict()
                })

        for li in itertools.chain(added, removed):
            li.sort(key=lambda x: x['name'])

        for li in changed:
            li.sort(key=lambda x: (x['before']['name'], x['after']['name']))

        deltas.append({
            'date': date, 
            'layer': current.layer, 
            'added': {'types': added[0], 'functions': added[1]},
            'removed': {'types': removed[0], 'functions': removed[1]},
            'changed': {'types': changed[0], 'functions': changed[1]}
        })
        previous = current

    return deltas

def main():
    pull()
    extract()
    load_tl()
    with open('diff.js', 'w') as fd:
        fd.write('DIFF=')
        json.dump(gen_index(), fd)
        fd.write('\n')

if __name__ == '__main__':
    main()

