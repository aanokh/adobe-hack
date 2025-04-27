from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
from pathlib import Path
from latex import render_latex_to_image

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI
from langchain.chains.combine_documents.stuff import create_stuff_documents_chain
from langchain_core.prompts import PromptTemplate

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import json

from pydantic import BaseModel, Field, model_validator

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from openai import OpenAI
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import time
import os
import base64

import base64, io, os, time
from PIL import Image


app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
 #   "https://wih8j466k.wxp.adobe-addons.com",  # your add-on iframe origin
  #  "https://localhost:5421",                   # dev origin
 # ],
allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static",
)

llm = ChatOpenAI(model="gpt-4.1")
reasoning_llm = ChatOpenAI(model="o4-mini")

client = OpenAI(api_key=OPENAI_API_KEY)


# === QUIZZES ===
class QuizProblem(BaseModel):
    title: str = Field(description="The title of the problem")
    problem: str = Field(description="The problem itself. Use latex, surround your math in delimeters")
    correct_answer: str = Field(description="Correct answer. Use latex, surround your math in delimeters")
    wrong_answer_1: str = Field(description="Plausible but wrong answer. Use latex, surround your math in delimeters")
    wrong_answer_2: str = Field(description="Plausible but wrong answer. Use latex, surround your math in delimeters")
    wrong_answer_3: str = Field(description="Plausible but wrong answer. Use latex, surround your math in delimeters")

class Quiz(BaseModel):
    title: str = Field(description="Quiz title")
    problems: List[QuizProblem] = Field(default_factory=list, description="List of quiz problems")

quiz_parser = PydanticOutputParser(pydantic_object=Quiz)
quiz_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a professor with 30 years of experience. Using the provided file which can either be a syllabus or a lecture transcript, generate 3 quiz problems to help the user study what they described in their prompt. Be professional and accurate; each quiz problem should be a challenging university level problem with multiple steps. Make sure your answers are correct and accurate. Since the quiz is multiple choice, you should also generate 3 wrong answers for every problem. Make sure they are actually wrong but still believable, and that its not obvious which is the right one at a glimpse. When generating unicode, please try to avoid putting direct unicode characters like ρ , instead use proper latex like backslash rho. Be careful when generating latex and use delimeters!! Make sure to not put latex delimeters by themselves. Do not use backslash . ! dont use . inside math latex blocks at all. Please try to make sure that the quiz doesn't ask any material that isn't covered in the provided files, unless the user specifically requests it."
        "\n\nContext: {context}\n\n"
        "User request: {question}\n"
        "Answer following the following format instructions: {format_instructions}\n"
    )
)
quiz_chain = create_stuff_documents_chain(llm=reasoning_llm, prompt=quiz_prompt)

# === OUTLINE ===
class Outline(BaseModel):
    titles: List[str] = Field(default_factory=list, description="List of slide titles")

outline_parser = PydanticOutputParser(pydantic_object=Outline)
outline_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a professor, student and tutor with 30 years of experience. Using the provided file which can either be a syllabus or a lecture transcript, help begin generating a slide deck to answer the user's prompt. Generate a tentative presentation outline, with 5 slide names covering the requested topics.\n\n"
        "Context: {context}\n\n"
        "User request: {question}\n"
        "Answer following the following format instructions: {format_instructions}\n"
    )
)
outline_chain = create_stuff_documents_chain(llm=llm, prompt=outline_prompt)


# === FLASHCARDS ===
class Flashcard(BaseModel):
    question: str = Field(description="The question, front side of the card")
    answer: str = Field(description="The answer, back side of the card")

class FlashcardList(BaseModel):
    flashcards: List[Flashcard] = Field(default_factory=list, description="List of flashcards")

flashcards_parser = PydanticOutputParser(pydantic_object=FlashcardList)
flashcards_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a professor, student and tutor with 30 years of experience. Using the provided file which can either be a syllabus or a lecture transcript, generate 10 flashcards to help the user study what they described in their prompt. Keep in mind these are flashcards not quizzes; The questions should mostly be textual and conceptual, not involving calculations. If theres anything to memorize in the text (ie names of ions for example for a chemistry class) prioritize that. Do not use latex.\n\n"
        "Context: {context}\n\n"
        "User request: {question}\n"
        "Answer following the following format instructions: {format_instructions}\n"
    )
)
flashcards_chain = create_stuff_documents_chain(llm=llm, prompt=flashcards_prompt)

# === STUDY GUIDE ===
class Topic(BaseModel):
    title: str = Field(description="The name of this topic")
    bullets: List[str] = Field(description="Concise bullet points in this topic", default_factory=list)

class StudyGuide(BaseModel):
    title: str = Field(description="Title of the study guide")
    topics: List[Topic] = Field(
        default_factory=list,
        description="List of topics in this study guide"
    )
studyguide_parser = PydanticOutputParser(pydantic_object=StudyGuide)
studyguide_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a professor, student and tutor with 30 years of experience. Using the provided file which can either be a syllabus or a lecture transcript, generate a study / review guide for the users request. Identify the main topics, and then for each topic some key bullet points. Generate 2-4 topics, and 1-2 bullets per topic. Make the bullet points descriptive, but concise! Don't make more than 4 topics.\n\n"
        "Context: {context}\n\n"
        "User request: {question}\n"
        "Answer following the following format instructions: {format_instructions}\n"
    )
)
studyguide_chain = create_stuff_documents_chain(llm=llm, prompt=studyguide_prompt)

# === SLIDE DECK ===
class Slide(BaseModel):
    title: str = Field(description="The title of the slide")
    content: str = Field(description="Content of the slide (Do not use latex or mathtype!)")
    image: Optional[str] = Field(
            None,
            description="Description of an image that you would like to accompany the slide (optional)"
        )

class SlideDeck(BaseModel):
    slides: List[Slide] = Field(description="The slides in the slide deck", default_factory=list)
    
slidedeck_parser = PydanticOutputParser(pydantic_object=SlideDeck)
slidedeck_prompt = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a professor, student and tutor with 30 years of experience. Using the provided file which can either be a syllabus or a lecture transcript, generate a comprehensive slide deck fulfilling the user's request. Follow the provided outline as closely as possible, which should have a bullet point / title for each slide. Prioritize the user's request and outline over the context. Base each slide from one of the points from the outline. Be professional and serious, this is serious academic content. Generate around 5 slides. If you ever think that you want to generate an accurate image or diagram, add its description to the output. Be descriptive, here is an example image prompt: >An educational diagram showing the water cycle, labeled with arrows, colorful and clean style.< Do not generate more than 2 images. Do not use latex at all!! Do not use Math Type!\n\n"
        "Context: {context}\n\n"
        "User request: {question}\n"
        "Outline: {outline}\n"
        "Answer following the following format instructions: {format_instructions}\n"
    )
)
slidedeck_chain = create_stuff_documents_chain(llm=llm, prompt=slidedeck_prompt)

@app.post("/generate-slidedeck", response_model=SlideDeck)
async def generate_slidedeck(
    file: UploadFile = File(...),
    description: str = Form(...)
):
    try:
        description_dict = json.loads(description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`metadata` is not valid JSON")

    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    question = description_dict['prompt']
    outline = description_dict['outline']
    answer = slidedeck_chain.invoke({"context": docs, "question": question, "outline": outline, "format_instructions": slidedeck_parser.get_format_instructions()})
    print(answer)

    try:
        slidedeck: SlideDeck = slidedeck_parser.invoke(answer)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "msg": "LLM output validation failed",
            "errors": e
        })

    for slide in slidedeck.slides:
        if slide.image:
            try:
                result = client.images.generate(
                    model="gpt-image-1",
                    prompt=f"Use only English. {slide.image}",
                    size="1536x1024"
                )

                image_base64 = result.data[0].b64_json
                image_bytes = base64.b64decode(image_base64)

                img = Image.open(io.BytesIO(image_bytes))

                new_w, new_h = 384, 256
                resized = img.resize((new_w, new_h), Image.LANCZOS)


                timestamp = int(time.time() * 1000)
                filename = f"slide_image_{timestamp}.png"
                filepath = os.path.join("static", filename)

                resized.save(filepath, format="PNG")

                slide.image = f"https://wufhalwuhlwauhflu.online/{filepath}"
            except Exception as e:
                print(f"Failed to generate image for slide: {e}")
                slide.image = None

    return slidedeck

@app.post("/generate-outline", response_model=Outline)
async def generate_outline(
    file: UploadFile = File(...),
    description: str = Form(...)
):
    try:
        description_dict = json.loads(description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`metadata` is not valid JSON")

    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    question = description_dict['prompt']
    answer = outline_chain.invoke({"context": docs, "question": question, "format_instructions": outline_parser.get_format_instructions()})
    print(answer)

    try:
        outline: Outline = outline_parser.invoke(answer)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "msg": "LLM output validation failed",
            "errors": e
        })

    return outline

@app.post("/generate-quiz", response_model=Quiz)
async def generate_quiz(
    file: UploadFile = File(...),
    description: str = Form(...)
):
    try:
        description_dict = json.loads(description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`metadata` is not valid JSON")

    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    question = description_dict['prompt']
    answer = quiz_chain.invoke({"context": docs, "question": question, "format_instructions": quiz_parser.get_format_instructions()})
    print(answer)

    try:
        quiz: Quiz = quiz_parser.invoke(answer)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "msg": "LLM output validation failed",
            "errors": e
        })

    for problem in quiz.problems:
        tasks = []
        if problem.problem:
            tasks.append(render_latex_to_image(problem.problem))
        if problem.correct_answer:
            tasks.append(render_latex_to_image(problem.correct_answer, 4, 2, 30))
        if problem.wrong_answer_1:
            tasks.append(render_latex_to_image(problem.wrong_answer_1, 4, 2, 30))
        if problem.wrong_answer_2:
            tasks.append(render_latex_to_image(problem.wrong_answer_2, 4, 2, 30))
        if problem.wrong_answer_3:
            tasks.append(render_latex_to_image(problem.wrong_answer_3, 4, 2, 30))
        
        if tasks:
            image_paths = await asyncio.gather(*tasks)
            
            for image_path in image_paths:
              full_path = os.path.join("static", image_path)
              wait_time = 0
              while not os.path.exists(full_path):
                  print(f"Waiting for file to exist: {full_path}")
                  await asyncio.sleep(0.1)
                  wait_time += 0.1
                  if wait_time > 5:
                      print(f"File did not appear in time: {full_path}")
                      break

              if os.path.exists(full_path):
                  with open(full_path, "rb") as f:
                      f.read(1)

            path_index = 0
            if problem.problem:
                problem.problem = f"https://wufhalwuhlwauhflu.online/{image_paths[path_index]}"
                path_index += 1
            if problem.correct_answer:
                problem.correct_answer = f"https://wufhalwuhlwauhflu.online/{image_paths[path_index]}"
                path_index += 1
            if problem.wrong_answer_1:
                problem.wrong_answer_1 = f"https://wufhalwuhlwauhflu.online/{image_paths[path_index]}"
                path_index += 1
            if problem.wrong_answer_2:
                problem.wrong_answer_2 = f"https://wufhalwuhlwauhflu.online/{image_paths[path_index]}"
                path_index += 1
            if problem.wrong_answer_3:
                problem.wrong_answer_3 = f"https://wufhalwuhlwauhflu.online/{image_paths[path_index]}"

    return quiz

@app.post("/generate-studyguide", response_model=StudyGuide)
async def generate_studyguide(
    file: UploadFile = File(...),
    description: str = Form(...)
):
    try:
        description_dict = json.loads(description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`metadata` is not valid JSON")

    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    question = description_dict['prompt']
    answer = studyguide_chain.invoke({"context": docs, "question": question, "format_instructions": studyguide_parser.get_format_instructions()})
    print(answer)

    try:
        studyguide: StudyGuide = studyguide_parser.invoke(answer)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "msg": "LLM output validation failed",
            "errors": e
        })

    print(studyguide)
    return studyguide

@app.post("/generate-flashcards", response_model=FlashcardList)
async def generate_flashcards(
    file: UploadFile = File(...),
    description: str = Form(...)
):
    try:
        description_dict = json.loads(description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="`metadata` is not valid JSON")

    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    question = description_dict['prompt']
    answer = flashcards_chain.invoke({"context": docs, "question": question, "format_instructions": flashcards_parser.get_format_instructions()})
    print(answer)

    try:
        flashcard_list: FlashcardList = flashcards_parser.invoke(answer)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "msg": "LLM output validation failed",
            "errors": e
        })

    print(flashcard_list)
    return flashcard_list

@app.post("/upload-syllabus")
async def upload_syllabus(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    loader = PyPDFLoader(file_path)
    docs = loader.load()

    llm = ChatOpenAI(model="gpt-4.1")

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=(
            "You are a helpful assistant.  Use the following context to answer the question.\n\n"
            "{context}\n\n"
            "Question: {question}\n"
            "Answer:"
        ),
    )
    chain = create_stuff_documents_chain(llm=llm, prompt=prompt)

    question = "Describe what this PDF is about"
    answer = chain.invoke({"context": docs, "question": question})
    print(answer)

    return {
        "filename": file.filename,
        "status": "success",
        "size": file_path.stat().st_size,
        "message": answer
    }
