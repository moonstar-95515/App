import lodashGet from 'lodash/get';
import React from 'react';
import {TNodeChildrenRenderer} from 'react-native-render-html';
import _ from 'underscore';
import {usePersonalDetails} from '@components/OnyxProvider';
import {ShowContextMenuContext, showContextMenuForReport} from '@components/ShowContextMenuContext';
import Text from '@components/Text';
import UserDetailsTooltip from '@components/UserDetailsTooltip';
import withCurrentUserPersonalDetails from '@components/withCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import * as LocalePhoneNumber from '@libs/LocalePhoneNumber';
import Navigation from '@libs/Navigation/Navigation';
import * as PersonalDetailsUtils from '@libs/PersonalDetailsUtils';
import * as ReportUtils from '@libs/ReportUtils';
import personalDetailsPropType from '@pages/personalDetailsPropType';
import CONST from '@src/CONST';
import * as LoginUtils from '@src/libs/LoginUtils';
import ROUTES from '@src/ROUTES';
import htmlRendererPropTypes from './htmlRendererPropTypes';

const propTypes = {
    ...htmlRendererPropTypes,

    /** Current user personal details */
    currentUserPersonalDetails: personalDetailsPropType.isRequired,
};

function MentionUserRenderer(props) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const defaultRendererProps = _.omit(props, ['TDefaultRenderer', 'style']);
    const htmlAttribAccountID = lodashGet(props.tnode.attributes, 'accountid');
    const personalDetails = usePersonalDetails() || CONST.EMPTY_OBJECT;

    let accountID;
    let displayNameOrLogin;
    let navigationRoute;
    const tnode = props.tnode;
    
    const getMentionDisplayText = (displayText, accountId, userLogin = '') => {
        if (accountId && userLogin !== displayText) {
            return displayText;
        }
        if (!LoginUtils.areEmailsFromSamePrivateDomain(displayText, props.currentUserPersonalDetails.login)) {
            return displayText;
        }

        return displayText.split('@')[0];
    };

    if (!_.isEmpty(htmlAttribAccountID)) {
        const user = lodashGet(personalDetails, htmlAttribAccountID);
        accountID = parseInt(htmlAttribAccountID, 10);
        displayNameOrLogin = LocalePhoneNumber.formatPhoneNumber(lodashGet(user, 'login', '')) || lodashGet(user, 'displayName', '') || translate('common.hidden');
        displayNameOrLogin = getMentionDisplayText(displayNameOrLogin, htmlAttribAccountID, lodashGet(user, 'login', ''));
        navigationRoute = ROUTES.PROFILE.getRoute(htmlAttribAccountID);
    } else if (!_.isEmpty(tnode.data)) {
        // We need to remove the LTR unicode and leading @ from data as it is not part of the login
        displayNameOrLogin = tnode.data.replace(CONST.UNICODE.LTR, '').slice(1);
        tnode.data = tnode.data.replace(displayNameOrLogin, getMentionDisplayText(displayNameOrLogin, htmlAttribAccountID));

        accountID = _.first(PersonalDetailsUtils.getAccountIDsByLogins([displayNameOrLogin]));
        navigationRoute = ROUTES.DETAILS.getRoute(displayNameOrLogin);
    } else {
        // If neither an account ID or email is provided, don't render anything
        return null;
    }

    const isOurMention = accountID === props.currentUserPersonalDetails.accountID;

    return (
        <ShowContextMenuContext.Consumer>
            {({anchor, report, action, checkIfContextMenuActive}) => (
                <Text
                    suppressHighlighting
                    onLongPress={(event) => showContextMenuForReport(event, anchor, report.reportID, action, checkIfContextMenuActive, ReportUtils.isArchivedRoom(report))}
                    onPress={(event) => {
                        event.preventDefault();
                        Navigation.navigate(navigationRoute);
                    }}
                    role={CONST.ROLE.LINK}
                    accessibilityLabel={`/${navigationRoute}`}
                >
                    <UserDetailsTooltip
                        accountID={accountID}
                        fallbackUserDetails={{
                            displayName: displayNameOrLogin,
                        }}
                    >
                        <Text
                            style={[styles.link, _.omit(props.style, 'color'), StyleUtils.getMentionStyle(isOurMention), {color: StyleUtils.getMentionTextColor(isOurMention)}]}
                            role={CONST.ROLE.LINK}
                            testID="span"
                            href={`/${navigationRoute}`}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...defaultRendererProps}
                        >
                            {!_.isEmpty(htmlAttribAccountID) ? `@${displayNameOrLogin}` : <TNodeChildrenRenderer tnode={tnode} />}
                        </Text>
                    </UserDetailsTooltip>
                </Text>
            )}
        </ShowContextMenuContext.Consumer>
    );
}

MentionUserRenderer.propTypes = propTypes;
MentionUserRenderer.displayName = 'MentionUserRenderer';

export default withCurrentUserPersonalDetails(MentionUserRenderer);
