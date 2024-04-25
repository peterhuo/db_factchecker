"""API for running different agents"""
import os
from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import WikipediaLoader
from langchain.agents import tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.agents import AgentExecutor
from langchain import hub
from langchain.agents import AgentExecutor, create_self_ask_with_search_agent
from langchain_community.llms import Fireworks
from langchain_community.tools.tavily_search import TavilyAnswer
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)

class CustomWikiAgent:
  """
  The Customer Wiki Agent. It takes in a user claim, finds the keyword using GPT3.5 
  in the claim, queries into the Wikipedia API to find pages related to the keywords, 
  retrieves the introduction of these pages, feeds this information into GPT3.5 
  along with the original claim, and produces a verification regarding the claim.
  """
  def __init__(self, claim):
    self.claim = claim

  def execute_agent(self):
    tools, llm_tools = self.get_tools()
    agent_executor = AgentExecutor(agent=self.create_agent(llm_tools), tools=tools, verbose=True)
    
    response = agent_executor.invoke({"input": self.claim})
    final_answer = response.get("output", "")
    return final_answer

  def extract_keywords(self, n = 2):
    response = llm.invoke("What are the top {n} most important keywords to search for on Wikipedia to verify claim" + self.claim + " Please give the answer in a common delimited sentence with no space from the most important to the least important.")
    response = dict(response)['content'].split(',')
    return response
  
  def get_wikipedia_info(self, keywords, max_chars = 4000):
    result = ""
    for keyword in keywords:
      docs = WikipediaLoader(query=keyword, load_max_docs=1, doc_content_chars_max=max_chars).load()
      if docs:
        result += docs[0].page_content
    return result
  
  def get_tools(self):
    @tool
    def verify_claim(claim: str) -> str:
      """Returns the yes or no to verify a claim"""
      keywords = self.extract_keywords()
      wiki_info = self.get_wikipedia_info(keywords)

      response = llm.invoke("Verify the following claim " + claim + " Given this information: " + wiki_info)
      return dict(response)['content']
    
    tools = [verify_claim]
    llm_with_tools = llm.bind(functions=[convert_to_openai_function(t) for t in tools])
    return tools, llm_with_tools
  
  def create_agent(self, llm_tools):
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a powerful fact checker. Given input claim and relevant informaiton, you will respond Yes or No with a short justification citing from the wiki information."),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),])

    agent = ({
        "input": lambda x: x["input"],
        "agent_scratchpad": lambda x: format_to_openai_function_messages(x["intermediate_steps"]),}
      | prompt
      | llm_tools
      | OpenAIFunctionsAgentOutputParser())
    return agent

class SelfAskSearchAgent:
  """
  The Self-Ask with Search Agent. This is a type of agent that will search the prompt 
  on the internet. It uses search engine as an input, currently using Tavily. Then it 
  uses the input LLM to traverse the relevant documents, and produce a response to the 
  claim.
  """
  def __init__(self, claim):
    self.claim = claim

  def execute_agent(self):
    agent_executor = AgentExecutor(agent=self.create_agent(), tools=self.get_tools(), verbose=True, handle_parsing_errors=True)
    
    response = agent_executor.invoke({"input": self.claim})
    final_answer = response.get("output", "")
    return final_answer
  
  def get_tools(self):
    tools = [TavilyAnswer(max_results=1, name="Intermediate Answer")]
    return tools
  
  def create_agent(self):
    prompt = hub.pull("hwchase17/self-ask-with-search")
    llm = Fireworks()
    agent = create_self_ask_with_search_agent(llm, self.get_tools(), prompt)
    return agent
  
class DatabaseAgent:
  """
  The SQL Database Agent. This is a prebuilt agent that takes in an LLM and a 
  database. Given a prompt, it will use the LLM to generate SQL queries for the 
  database and generate a response to the claim.
  """
  def __init__(self, claim):
    self.claim = claim

  def execute_agent(self):
    db = SQLDatabase.from_uri("sqlite:///Chinook.db")
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    agent_executor = create_sql_agent(llm, db=db, agent_type="openai-tools", verbose=True)
    
    response = agent_executor.invoke({"input": self.claim})
    final_answer = response.get("output", "")
    return final_answer


#for running the api in terminal
if __name__ == "__main__":
  #ask the user to choose the agent they want to use
  claim = input("\nWhat is the claim?\n")
  agent = input("\nChoose your agent:\n1: Custom Wiki Agent\n2: Self-Ask with Search Agent\n3: SQL Database Agent\n")
  if agent == "1":
    print(CustomWikiAgent(claim).execute_agent())
  elif agent == "2":
    print(SelfAskSearchAgent(claim).execute_agent())
  elif agent == "3":
    print(DatabaseAgent(claim).execute_agent())

