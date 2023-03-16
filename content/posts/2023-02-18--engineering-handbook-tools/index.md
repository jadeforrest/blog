---
title: What tools to use for an engineering handbook
tags: ["process", "engineering-handbook"]
cover: umbrellas-2.jpg
author: Jade Rubick
discussionId: "engineering-handbook-tools"
description: "Reviews the various tools you can use for an engineering handbook and process documentation in general."
---

This contains my experience choosing tooling for an engineering handbook. It also has some points that might be relevant if you're evaluating a wiki.

<re-img src="umbrellas-2.jpg"></re-img>

The ideal tool would have these qualities:

**A short edit loop**. A challenge with maintaining process documentation is that the cost of making changes is often too high. The more expensive it is to suggest changes, the less participation you’ll have. 

This is something I think most leaders underestimate the importance of. I suggest you look at two scenarios when evaluating tooling:

1. How much effort does it take to correct a typo?
2. How much effort does it take to add a new page?

You know this is an issue when people will propose a workflow like this:

1. We’ll use Google Docs to collaborate on things before they’re official.
2. Then we’ll copy them into Confluence when we’re done.

This is acknowledging that Confluence is terrible at the job of collaboration. So why would you choose to store your content there long-term?

<table cellspacing="0">
  <tr>
   <td>
   </td>
   <td>Github
   </td>
   <td>Google Docs
   </td>
   <td>Confluence
   </td>
   <td>Slite/Notion-like wikis
   </td>
  </tr>
  <tr>
   <td>Correct a typo
   </td>
   <td>Days
   </td>
   <td>Seconds
   </td>
   <td>Tens of seconds
   </td>
   <td>Seconds
   </td>
  </tr>
  <tr>
   <td>Add a page
   </td>
   <td>Days
   </td>
   <td>Tens of seconds
   </td>
   <td>Tens of seconds
   </td>
   <td>Tens of seconds
   </td>
  </tr>
</table>

Based on this criteria alone, I tend to order these solutions like this: 

Modern wikis (Slite/Notion) or Google Docs > Confluence > Github

**Easy for many types of people to contribute**. If you’re an engineering leader, you may care mostly about engineering. So you may think you should focus on engineering team needs for the handbook. But you’ll soon find that Product and Design and Support will all want to be a part of your process docs. It’s useful to be able to work on a shared process with Support.

Some tooling is harder for other specialties to use. Github is primarily an engineering tool, for example, and is challenging for many types of people to engage with. 

Based on this criteria, I tend to order these solutions like this:

Google Docs > Modern wikis (Slite/Notion) > Confluence > Github

**Have flexible permissions and an approval process**. Ideally, you’d have some sort of an approval process, and you can have a discussion about a set of changes.

For larger changes, Github is pretty ideal. You can write up a set of changes and have an approval process that the change goes through. But the approval process for Github takes so long that I find it disincentivizes minor edits, and your process documents will degrade over time. In fact, I find it so bad that I’d rather have no approval process and just open up process docs to allow anyone to edit everything than to have a rigorous approval process. But your organization may have different preferences.

Google Docs is pretty hard to beat, from both a permissions perspective, and the ability to suggest changes. You can set your permissions based on the context, which is a major advantage. Sensitive content can be set up so anyone can suggest changes. But less sensitive content can be world editable. And the “suggest changes” functionality is truly useful. However, Google Docs does have some awkwardness around inheriting permissions from parent folders.

Based on this criteria, I tend to order these solutions like this:

Google Docs > Github > Confluence > Modern wikis (Slite/Notion)

**Easy to organize your content**. Finally, you want to be able to navigate your content and organize it. 

<table cellspacing="0">
  <tr>
   <td>
   </td>
   <td>Github
   </td>
   <td>Google Docs
   </td>
   <td>Confluence
   </td>
   <td>Slite/Notion-like wikis
   </td>
  </tr>
  <tr>
   <td>Ability to organize content
   </td>
   <td>Slow, requires technical skills.
   </td>
   <td>Slow. Have to manually insert links for everything.
   </td>
   <td>Fairly easy
   </td>
   <td>Fairly easy
   </td>
  </tr>
</table>


For ease of content organization:

Confluence and modern wikis (Slite/Notion) > Google Docs > Github

**Ease of marketing**. Finally, you need to get an organization of people to use these process docs. Some tools are easier to market than others.

<table cellspacing="0">
  <tr>
   <td>
   </td>
   <td>Github
   </td>
   <td>Google Docs
   </td>
   <td>Confluence
   </td>
   <td>Slite/Notion-like wikis
   </td>
  </tr>
  <tr>
   <td>Marketability
   </td>
   <td>Engineers will love to use it. Signals you care about their participation. Others will feel excluded.
   </td>
   <td>Everyone will complain that it seems wrong to use Google Docs for a handbook.
   </td>
   <td>Everyone will think it’s a natural place to put things. But won’t use it without prodding.
   </td>
   <td>If you’re already using the tools, people will think it’s natural. 
   </td>
  </tr>
</table>

Based on this criteria, I tend to order these solutions like this:

Github or Slite/Notion-like wikis > Confluence > Google Docs


### Conclusion

I recommend using a modern wiki for process docs ([Slite](https://refer.slite.com/9a4s8hl7i0ta) or Notion are the ones I would start with). I would also consider using Google Docs. 

(Note I get a referral fee if you click the link above for Slite, but recommended it long before I included that link and will remove the link if I find another wiki I prefer).

If I wanted to kickstart the process with engineering, I would consider using Github for a while. You could then migrate to another tool when other functions like product and design and support want to participate.


Image by <a href="https://pixabay.com/users/pexels-2286921/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1834286">Pexels</a> from <a href="https://pixabay.com//?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1834286">Pixabay</a>