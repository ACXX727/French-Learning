"""课程文件读写。课程以 .js 保存（lexiqueData({...});），这样直接双击 index.html 也能加载。"""
import json

PREFIX, SUFFIX = 'lexiqueData(', ');\n'
INLINE = 100  # 只含字符串 / 数字的短列表写在一行里，例如 ["people", 0]


def read(path):
    s = open(path, encoding='utf-8').read().strip()
    if not (s.startswith(PREFIX) and s.endswith(');')):
        raise ValueError(f'{path} 不是 lexiqueData(...) 格式')
    return json.loads(s[len(PREFIX):-2])


def _dump(o, ind):
    pad, inner = ' ' * ind, ' ' * (ind + 1)
    if isinstance(o, dict):
        if not o:
            return '{}'
        return '{\n' + ',\n'.join(f'{inner}{json.dumps(k, ensure_ascii=False)}: {_dump(v, ind + 1)}' for k, v in o.items()) + f'\n{pad}}}'
    if isinstance(o, list):
        if not o:
            return '[]'
        flat = json.dumps(o, ensure_ascii=False)
        if all(not isinstance(v, (dict, list)) for v in o) and len(flat) <= INLINE:
            return flat
        return '[\n' + ',\n'.join(inner + _dump(v, ind + 1) for v in o) + f'\n{pad}]'
    return json.dumps(o, ensure_ascii=False)


def write(path, data):
    text = _dump(data, 0)
    assert json.loads(text) == data  # 格式化不能改变内容
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(PREFIX + text + SUFFIX)
