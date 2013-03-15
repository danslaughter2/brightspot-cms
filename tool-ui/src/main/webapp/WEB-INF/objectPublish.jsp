<%@ page import="

com.psddev.cms.db.Content,
com.psddev.cms.db.Draft,
com.psddev.cms.db.Schedule,
com.psddev.cms.tool.ToolPageContext,

com.psddev.dari.db.CachingDatabase,
com.psddev.dari.db.Query,
com.psddev.dari.db.State,
com.psddev.dari.util.ObjectUtils,

java.util.Date,
java.util.LinkedHashMap,
java.util.LinkedHashSet,
java.util.Map,
java.util.Set,
java.util.UUID
" %><%

// --- Logic ---

ToolPageContext wp = new ToolPageContext(pageContext);
if (!wp.isFormPost()) {
    return;
}

String action = wp.param("action");
if (!("Publish".equals(action)
        || "Update".equals(action)
        || "Schedule".equals(action)
        || "Reschedule".equals(action))) {
    return;
}

Object object = request.getAttribute("object");
State state = State.getInstance(object);
Draft draft = wp.getOverlaidDraft(object);
UUID variationId = wp.uuidParam("variationId");

try {
    state.beginWrites();

    if (variationId == null) {
        wp.include("/WEB-INF/objectPost.jsp", "object", object, "original", object);
        wp.include("/WEB-INF/widgetsUpdate.jsp", "object", object, "original", object);

    } else {
        Object original = Query.
                from(Object.class).
                where("_id = ?", state.getId()).
                option(CachingDatabase.IS_DISABLED_QUERY_OPTION, Boolean.TRUE).
                first();
        Map<String, Object> oldStateValues = State.getInstance(original).getSimpleValues();

        wp.include("/WEB-INF/objectPost.jsp", "object", object, "original", original);
        wp.include("/WEB-INF/widgetsUpdate.jsp", "object", object, "original", original);

        Map<String, Object> newStateValues = state.getSimpleValues();
        Set<String> stateKeys = new LinkedHashSet<String>();
        Map<String, Object> stateValues = new LinkedHashMap<String, Object>();

        stateKeys.addAll(oldStateValues.keySet());
        stateKeys.addAll(newStateValues.keySet());

        for (String key : stateKeys) {
            Object value = newStateValues.get(key);
            if (!ObjectUtils.equals(oldStateValues.get(key), value)) {
                stateValues.put(key, value);
            }
        }

        State.getInstance(original).putValue("variations/" + variationId.toString(), stateValues);
        object = original;
        state = State.getInstance(object);
    }

    Date publishDate = wp.dateParam("publishDate");
    if (publishDate != null && publishDate.before(new Date())) {
        state.as(Content.ObjectModification.class).setPublishDate(publishDate);
        publishDate = null;
    }

    if (publishDate != null) {
        state.validate();

        if (draft == null) {
            draft = new Draft();
            draft.setOwner(wp.getUser());
            draft.setObject(object);
        } else {
            draft.setObject(object);
        }

        Schedule schedule = draft.getSchedule();
        if (schedule == null) {
            schedule = new Schedule();
            schedule.setTriggerSite(wp.getSite());
            schedule.setTriggerUser(wp.getUser());
        }
        schedule.setTriggerDate(publishDate);
        schedule.save();

        draft.setSchedule(schedule);
        draft.save();
        state.commitWrites();
        wp.redirect("", ToolPageContext.DRAFT_ID_PARAMETER, draft.getId());

    } else {
        if (draft != null) {
            draft.delete();
        }
        wp.publish(object);
        state.commitWrites();
        wp.redirect("",
                "_isFrame", wp.boolParam("_isFrame"),
                "id", state.getId(),
                "historyId", null,
                "copyId", null,
                "published", System.currentTimeMillis());
    }

} catch (Exception ex) {
    wp.getErrors().add(ex);

} finally {
    state.endWrites();
}
%>