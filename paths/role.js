GM_LINE_ID = ["GM", "Ud2c5795896661cb1d18de9c2f376f840", "Ud4950152166cf7eee09f8a2ade171cc0"]

module.exports = {
    is_gm(id) {
        return !!GM_LINE_ID.find((e) => e === id);
    }
}
