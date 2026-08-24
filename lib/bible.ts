import data from '../assets/bible.json';
export type Verse={verse:number,text:string};
export type Chapter={chapter:number,verses:Verse[]};
export type Book={name:string,chapters:Chapter[]};
export const bible=data as {version:string;language:string;books:Book[]};
export function getBook(name?:string){return bible.books.find(b=>b.name===name)||bible.books[0]}
export function getChapter(bookName:string, chapter:number){return getBook(bookName).chapters.find(c=>c.chapter===chapter)||getBook(bookName).chapters[0]}
export function dailyVerse(){const all=bible.books.flatMap(b=>b.chapters.flatMap(c=>c.verses.map(v=>({book:b.name,chapter:c.chapter,verse:v.verse,text:v.text})))); const day=Math.floor(Date.now()/86400000); return all[day%all.length]}
