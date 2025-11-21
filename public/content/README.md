# Content 폴더 구조

이 폴더에 카테고리별로 MD 파일을 저장하세요.

## 폴더 구조 예시

```
content/
├── index.json          # 카테고리 목록 정의
├── category1/
│   ├── index.json      # 해당 카테고리의 파일 목록
│   ├── file1.md
│   └── file2.md
└── category2/
    ├── index.json
    └── file1.md
```

## index.json 형식

### content/index.json
```json
{
  "categories": ["category1", "category2"]
}
```

### content/category1/index.json
```json
{
  "files": ["file1.md", "file2.md"]
}
```

## MD 파일 형식

```markdown
<<<<<
카드 본문 내용입니다.
여러 줄로 작성할 수 있습니다.
>>>>> 

<<<<<
다른 카드 내용입니다.

###

추가 설명이 있다면 ### 다음에 작성합니다.
>>>>> 
```

