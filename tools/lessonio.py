"""课程文件读写。课程以 .js 保存（lexiqueData({...});），这样直接双击 index.html 也能加载。"""
import json

PREFIX, SUFFIX = 'lexiqueData(', ');\n'


def read(path):
    s = open(path, encoding='utf-8').read().strip()
    if not (s.startswith(PREFIX) and s.endswith(');')):
        raise ValueError(f'{path} 不是 lexiqueData(...) 格式')
    return json.loads(s[len(PREFIX):-2])


def write(path, data):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(PREFIX + json.dumps(data, ensure_ascii=False, indent=1) + SUFFIX)
